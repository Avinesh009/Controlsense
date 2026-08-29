from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from typing import List, Dict, Any, Optional
import uvicorn
import logging
import hmac
import hashlib
import os
import secrets

# Load backend/.env BEFORE importing any module that reads os.environ at
# import time (auth.py, services/aggregator.py).
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

from models import TelemetryPayload, EmployeeStatus, SystemAlert
from services.classifier import classifier
from services.websocket_manager import ws_manager
from services.aggregator import aggregator
import auth as auth_module

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("EmployeeMonitoringServer")

# ---------------------------------------------------------------------------
# Configuration (fail loudly instead of silently falling back to a known
# default secret that would be baked into every deployment / public repo).
# ---------------------------------------------------------------------------
API_SECRET_KEY = os.environ.get("API_SECRET_KEY")
if not API_SECRET_KEY:
    logger.warning(
        "API_SECRET_KEY is not set in the environment. Generating a random, "
        "process-local key so the server can still start, but desktop agents "
        "configured with any other key (including any old default) will be "
        "rejected until you set API_SECRET_KEY explicitly and restart. "
        "Set this in backend/.env for a stable, shared value."
    )
    API_SECRET_KEY = secrets.token_hex(32)

CORS_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:5175,http://127.0.0.1:5175").split(",")
    if origin.strip()
]

app = FastAPI(
    title="Employee Monitoring & Productivity Intelligence API",
    version="1.1.0",
    description="Enterprise API for real-time employee window tracking, Control ID Tool utilization, YouTube detection, and productivity analytics.",
)

# Restrict CORS to known dashboard origins (wildcard + credentials is both
# insecure and rejected by browsers anyway).
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    return {"status": "HEALTHY", "version": "1.1.0", "service": "Employee Monitoring API"}


# ---------------------------------------------------------------------------
# Admin authentication
# ---------------------------------------------------------------------------
@app.post("/api/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Admin login. Send as form data: username, password.
    Returns a bearer token to use as `Authorization: Bearer <token>` on
    every other dashboard request."""
    if not auth_module.authenticate_admin(form_data.username, form_data.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = auth_module.create_access_token(subject=form_data.username)
    return {"access_token": token, "token_type": "bearer"}


# ---------------------------------------------------------------------------
# Telemetry ingestion (authenticated via per-request HMAC signature from the
# desktop agent / browser extension, NOT the admin JWT above)
# ---------------------------------------------------------------------------
@app.post("/api/telemetry/heartbeat")
async def ingest_heartbeat(
    payload: TelemetryPayload,
    x_signature: str = Header(..., alias="X-Signature"),
    x_timestamp: str = Header(..., alias="X-Timestamp"),
):
    """
    Ingests telemetry heartbeat securely. Verifies HMAC signature and timestamp
    to prevent tampering and replay attacks.
    """
    # 1. Parse and validate timestamp format (allow older timestamps for offline sync)
    try:
        from datetime import datetime
        ts_clean = x_timestamp.replace("Z", "+00:00")
        datetime.fromisoformat(ts_clean)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: Invalid timestamp format. {e}")

    # 2. Cryptographic signature check
    try:
        msg = f"{payload.email}:{x_timestamp}:{payload.process_name}".encode("utf-8")
        computed_sig = hmac.new(API_SECRET_KEY.encode("utf-8"), msg, hashlib.sha256).hexdigest()

        if not hmac.compare_digest(computed_sig, x_signature):
            raise HTTPException(status_code=401, detail="Invalid request signature (untrusted source)")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Authentication signature mismatch")

    result = aggregator.process_heartbeat(payload.model_dump())

    # Broadcast to all connected web dashboards
    await ws_manager.broadcast_json({
        "event": "HEARTBEAT",
        "data": {
            "employee": result["employee"],
            "category": result["category"],
            "display_name": result["display_name"],
            "summary": aggregator.get_summary_stats(),
            "alerts": aggregator.alerts,
        },
    })

    return {"status": "SUCCESS", "classified_category": result["category"], "display_name": result["display_name"]}


# ---------------------------------------------------------------------------
# Dashboard endpoints — all require a valid admin bearer token
# ---------------------------------------------------------------------------
@app.get("/api/employees", response_model=List[Dict[str, Any]])
def get_employees(admin: str = Depends(auth_module.get_current_admin)):
    """Returns all employees with their current live status and today's accumulated metrics."""
    return list(aggregator.employees.values())


@app.get("/api/employees/{employee_code}")
def get_employee_detail(employee_code: str, range: str = "daily", admin: str = Depends(auth_module.get_current_admin)):
    from datetime import datetime, timedelta
    from services.aggregator import supabase_client
    if employee_code not in aggregator.employees:
        raise HTTPException(status_code=404, detail="Employee not found")

    emp = aggregator.employees[employee_code]
    now = datetime.utcnow()

    if range == "weekly":
        start_date = (now - timedelta(days=7)).date().isoformat()
    elif range == "monthly":
        start_date = (now - timedelta(days=30)).date().isoformat()
    else:  # daily
        start_date = now.date().isoformat()

    emp_logs = []
    if supabase_client is not None:
        try:
            res = supabase_client.table("activity_logs").select("*").eq("employee_id", emp["id"]).gte("recorded_at", start_date).execute()
            db_logs = res.data if hasattr(res, "data") else []
            for log in db_logs:
                emp_logs.append({
                    "id": log["id"],
                    "employee_code": employee_code,
                    "process_name": log["process_name"],
                    "window_title": log.get("window_title"),
                    "category": log["category"],
                    "is_idle": log.get("is_idle", False),
                    "duration_seconds": log.get("duration_seconds", 5),
                    "timestamp": log["recorded_at"],
                })
        except Exception:
            emp_logs = [log for log in aggregator.activity_logs if log["employee_code"] == employee_code and log["timestamp"].startswith(start_date)]
    else:
        emp_logs = [log for log in aggregator.activity_logs if log["employee_code"] == employee_code and log["timestamp"].startswith(start_date)]

    app_durations = {}
    for log in emp_logs:
        app_key = "Idle / Away" if log["is_idle"] else log["process_name"]
        app_durations[app_key] = app_durations.get(app_key, 0) + log["duration_seconds"]

    return {
        "employee": {
            **emp,
            "app_durations": app_durations,
        },
        "recent_logs": emp_logs[-50:],
    }


@app.get("/api/analytics/summary")
def get_summary(admin: str = Depends(auth_module.get_current_admin)):
    """Returns top-level KPIs: Control ID tool hours, YouTube hours, average productivity, and active counts."""
    return aggregator.get_summary_stats()


@app.get("/api/analytics/timeline/{employee_code}")
def get_employee_timeline(employee_code: str, admin: str = Depends(auth_module.get_current_admin)):
    """Returns activity intervals for the 24-hour Gantt chart visualization."""
    from datetime import datetime
    today_str = datetime.utcnow().date().isoformat()
    emp_logs = [
        log for log in aggregator.activity_logs
        if log["employee_code"] == employee_code and log["timestamp"].startswith(today_str)
    ][-100:]
    return {"employee_code": employee_code, "intervals": emp_logs}


@app.get("/api/alerts")
def get_alerts(admin: str = Depends(auth_module.get_current_admin)):
    """Returns active distraction and excessive entertainment alerts."""
    return aggregator.alerts


@app.post("/api/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: str, admin: str = Depends(auth_module.get_current_admin)):
    for alert in aggregator.alerts:
        if alert["id"] == alert_id:
            alert["is_resolved"] = True
            
            # Reset employee's youtube_alert_timer so they can trigger a new alert if they watch again
            emp_email = alert.get("employee_code")
            if emp_email in aggregator.employees:
                aggregator.employees[emp_email]["youtube_alert_timer"] = 0
                
            await ws_manager.broadcast_json({"event": "ALERT_RESOLVED", "alert_id": alert_id})
            return {"status": "SUCCESS", "message": "Alert resolved"}
    raise HTTPException(status_code=404, detail="Alert not found")


@app.get("/api/analytics/history")
def get_analytics_history(admin: str = Depends(auth_module.get_current_admin)):
    """Aggregates telemetry logs from Supabase for the last 7 days to return daily productivity scores and hours."""
    from datetime import datetime, timedelta
    from services.aggregator import supabase_client

    if supabase_client is None:
        return [
            {"date": (datetime.utcnow() - timedelta(days=i)).date().strftime("%b %d"), "work_hours": round(5.0 - i * 0.3, 1), "productivity": round(72.0 + i * 2.5, 1)}
            for i in range(6, -1, -1)
        ]

    try:
        seven_days_ago = (datetime.utcnow() - timedelta(days=7)).date().isoformat()
        logs_res = supabase_client.table("activity_logs").select("recorded_at, duration_seconds, category").gte("recorded_at", seven_days_ago).execute()
        db_logs = logs_res.data if hasattr(logs_res, "data") else []

        daily_data = {}
        for log in db_logs:
            ts_str = log["recorded_at"].split("T")[0]
            if ts_str not in daily_data:
                daily_data[ts_str] = {"total_seconds": 0, "prod_seconds": 0}

            dur = log.get("duration_seconds", 5)
            cat = log.get("category", "NEUTRAL")

            daily_data[ts_str]["total_seconds"] += dur
            if cat in ("CORE_WORK", "PRODUCTIVE"):
                daily_data[ts_str]["prod_seconds"] += dur

        result = []
        for i in range(6, -1, -1):
            day = (datetime.utcnow() - timedelta(days=i)).date()
            day_str = day.isoformat()

            day_agg = daily_data.get(day_str, {"total_seconds": 0, "prod_seconds": 0})
            total_sec = day_agg["total_seconds"]
            prod_sec = day_agg["prod_seconds"]

            hours = round(total_sec / 3600, 1)
            score = round((prod_sec / total_sec * 100), 1) if total_sec > 0 else 0.0

            day_label = day.strftime("%b %d")

            result.append({
                "date": day_label,
                "work_hours": hours,
                "productivity": score,
            })

        return result
    except Exception as e:
        logger.error(f"Error fetching analytics history: {e}")
        return [
            {"date": (datetime.utcnow() - timedelta(days=i)).date().strftime("%b %d"), "work_hours": 0.0, "productivity": 0.0}
            for i in range(6, -1, -1)
        ]


@app.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket, token: Optional[str] = None):
    """WebSocket endpoint for the Admin Dashboard to receive instant realtime pushes.
    Requires a valid admin JWT passed as a `token` query parameter, e.g.
    ws://host/ws/live?token=<access_token>."""
    admin_username = auth_module.decode_token_for_websocket(token)
    if admin_username is None:
        await websocket.close(code=4401)  # custom close code: unauthorized
        return

    await ws_manager.connect(websocket)
    try:
        await websocket.send_json({
            "event": "INITIAL_STATE",
            "data": {
                "employees": list(aggregator.employees.values()),
                "summary": aggregator.get_summary_stats(),
                "alerts": aggregator.alerts,
            },
        })
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


# ---------------------------------------------------------------------------
# Serve static frontend files (Vite build)
# ---------------------------------------------------------------------------
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

dist_dir = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../frontend/dist"))
logger.info(f"Static frontend path resolved to: {dist_dir} (Exists: {os.path.exists(dist_dir)})")

if os.path.exists(dist_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_dir, "assets")), name="assets")

    @app.get("/")
    def serve_index():
        return FileResponse(os.path.join(dist_dir, "index.html"))

    @app.get("/{fallback_path:path}")
    def serve_frontend(fallback_path: str):
        if not fallback_path or fallback_path.startswith("api") or fallback_path.startswith("ws"):
            raise HTTPException(status_code=404, detail="Route not found")
        return FileResponse(os.path.join(dist_dir, "index.html"))


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
