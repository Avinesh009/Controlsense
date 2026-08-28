from typing import Dict, List, Any, Optional
from datetime import datetime, date
import uuid
from models import EmployeeStatus, SystemAlert
from services.classifier import classifier
import os

# Note: backend/.env is loaded once, centrally, by main.py (via python-dotenv)
# before this module is imported — so os.environ is already populated here.

# Initialize Supabase optionally if credentials are provided in environment
supabase_client = None
try:
    from supabase import create_client, Client
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if url and key:
        supabase_client = create_client(url, key)
        print("Connected to Supabase client successfully.")
except ImportError:
    pass

class DataAggregator:
    def __init__(self):
        # In-memory fast storage for live state and daily metrics (populated dynamically by real agent heartbeats)
        self.employees: Dict[str, Dict[str, Any]] = {}

        # Activity log history for timeline graphs
        self.activity_logs: List[Dict[str, Any]] = []
        
        # System alerts (populated dynamically by real agent heartbeats)
        self.alerts: List[Dict[str, Any]] = []

        # Sync and restore state from Supabase if connected
        if supabase_client is not None:
            self.load_state_from_supabase()

    def load_state_from_supabase(self):
        """Pulls today's logs from Supabase database to restore server state across restarts"""
        try:
            print("Syncing backend memory state with Supabase database...")
            
            # 1. Load employee profiles
            emp_res = supabase_client.table("employees").select("*").execute()
            db_employees = emp_res.data if hasattr(emp_res, 'data') else []
            
            for db_emp in db_employees:
                email = db_emp["email"]
                self.employees[email] = {
                    "id": db_emp["id"],
                    "employee_code": email,
                    "full_name": db_emp["full_name"],
                    "email": email,
                    "role": db_emp["role"],
                    "current_status": "OFFLINE",
                    "current_process": None,
                    "current_window_title": None,
                    "current_url": None,
                    "current_category": None,
                    "last_heartbeat": None,
                    "shift_start_time": None,
                    "shift_end_time": None,
                    "total_active_seconds": 0,
                    "total_idle_seconds": 0,
                    "control_id_seconds": 0,
                    "youtube_seconds": 0,
                    "other_productive_seconds": 0,
                    "unproductive_seconds": 0,
                    "productivity_score": 0.0,
                    "app_durations": {}
                }

            # 2. Query today's logs
            today_str = datetime.utcnow().date().isoformat()
            logs_res = supabase_client.table("activity_logs").select("*").gte("recorded_at", today_str).execute()
            db_logs = logs_res.data if hasattr(logs_res, 'data') else []

            for log in db_logs:
                # Find matching employee code based on ID or fallback
                matching_emp = None
                for emp in self.employees.values():
                    if emp["id"] == log.get("employee_id"):
                        matching_emp = emp
                        break
                
                if not matching_emp:
                    # If not found by ID, default to first or create fallback
                    if self.employees:
                        matching_emp = list(self.employees.values())[0]
                    else:
                        continue

                # Reconstruct shift times
                log_time_str = log.get("recorded_at")
                if log_time_str:
                    if not matching_emp.get("shift_start_time") or log_time_str < matching_emp["shift_start_time"]:
                        matching_emp["shift_start_time"] = log_time_str
                    if log.get("process_name") == "Logout":
                        if not matching_emp.get("shift_end_time") or log_time_str > matching_emp["shift_end_time"]:
                            matching_emp["shift_end_time"] = log_time_str

                interval = log.get("duration_seconds", 5)
                is_idle = log.get("is_idle", False)
                category = log.get("category", "NEUTRAL")
                proc_name = log.get("process_name", "")
                
                # Reconstruct time allocations
                if is_idle:
                    matching_emp["total_idle_seconds"] += interval
                elif category == "ENTERTAINMENT":
                    matching_emp["total_active_seconds"] += interval
                    matching_emp["unproductive_seconds"] += interval
                    if "youtube" in proc_name.lower():
                        matching_emp["youtube_seconds"] += interval
                elif category == "CORE_WORK":
                    matching_emp["total_active_seconds"] += interval
                    matching_emp["control_id_seconds"] += interval
                else:
                    matching_emp["total_active_seconds"] += interval
                    if category == "PRODUCTIVE":
                        matching_emp["other_productive_seconds"] += interval

                # Update wellbeing durations
                app_key = "Idle / Away" if is_idle else proc_name
                matching_emp["app_durations"][app_key] = matching_emp["app_durations"].get(app_key, 0) + interval

                # Append to activity_logs list
                self.activity_logs.append({
                    "id": log["id"],
                    "employee_code": matching_emp["email"],
                    "process_name": proc_name,
                    "window_title": log.get("window_title"),
                    "category": category,
                    "is_idle": is_idle,
                    "duration_seconds": interval,
                    "timestamp": log.get("recorded_at")
                })

            # Recalculate productivity scores
            for emp in self.employees.values():
                total_active = emp["total_active_seconds"]
                if total_active > 0:
                    prod = emp["control_id_seconds"] + emp["other_productive_seconds"]
                    emp["productivity_score"] = round((prod / total_active) * 100, 1)

            print(f"[OK] Restored state from Supabase: {len(self.employees)} employees, {len(self.activity_logs)} logs.")
        except Exception as e:
            print(f"Error loading state from Supabase: {e}")
        
        # System alerts (populated dynamically by real agent heartbeats)
        self.alerts: List[Dict[str, Any]] = []

    def process_heartbeat(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        email = payload.get("email", "")
        full_name = payload.get("full_name", email)
        interval = payload.get("interval_seconds", 5)
        proc_name = payload.get("process_name", "")
        win_title = payload.get("window_title", "")
        url = payload.get("active_url")
        is_idle = payload.get("is_idle", False)
        role = payload.get("role", "Team Member")
        now_iso = datetime.utcnow().isoformat() + "Z"

        # Classify the activity
        category, display_name, weight = classifier.classify(proc_name, win_title, url)

        # Ensure employee exists
        if email not in self.employees:
            self.employees[email] = {
                "id": str(uuid.uuid4())[:8],
                "employee_code": email,
                "full_name": full_name,
                "email": email,
                "role": role or "Team Member",
                "current_status": "OFFLINE",
                "current_process": None,
                "current_window_title": None,
                "current_url": None,
                "current_category": None,
                "last_heartbeat": None,
                "shift_start_time": None,
                "shift_end_time": None,
                "total_active_seconds": 0,
                "total_idle_seconds": 0,
                "control_id_seconds": 0,
                "youtube_seconds": 0,
                "other_productive_seconds": 0,
                "unproductive_seconds": 0,
                "productivity_score": 0.0,
                "app_durations": {}
            }

        emp = self.employees[email]
        emp["role"] = role or emp.get("role", "Team Member")

        # Daily reset logic: if the calendar day has changed, clear all accumulators for a fresh shift
        current_date_str = datetime.utcnow().date().isoformat()
        last_active = emp.get("last_active_date")
        if last_active and last_active != current_date_str:
            emp["total_active_seconds"] = 0
            emp["total_idle_seconds"] = 0
            emp["control_id_seconds"] = 0
            emp["youtube_seconds"] = 0
            emp["other_productive_seconds"] = 0
            emp["unproductive_seconds"] = 0
            emp["productivity_score"] = 0.0
            emp["app_durations"] = {}
            emp["shift_start_time"] = None
            emp["shift_end_time"] = None
        emp["last_active_date"] = current_date_str

        # Remove resolved alerts from previous days to keep the memory clean and allow new triggers on day changes
        self.alerts = [
            a for a in self.alerts
            if a.get("timestamp", "").startswith(current_date_str) or not a.get("is_resolved", False)
        ]

        # Track first check-in of the shift (Login)
        if not emp.get("shift_start_time"):
            emp["shift_start_time"] = now_iso

        # Handle explicit logout heartbeat
        if proc_name == "Logout":
            emp["current_status"] = "OFFLINE"
            emp["shift_end_time"] = now_iso
            emp["current_process"] = None
            emp["current_window_title"] = None
            emp["current_url"] = None
            emp["current_category"] = None
            emp["last_heartbeat"] = now_iso
            
            # Persist to Supabase if connected
            if supabase_client is not None:
                try:
                    res = supabase_client.table("employees").upsert({
                        "full_name": emp["full_name"],
                        "email": emp["email"],
                        "role": emp["role"]
                    }, on_conflict="email").execute()
                    
                    db_emp_id = None
                    if hasattr(res, 'data') and res.data:
                        db_emp_id = res.data[0]["id"]
                        emp["id"] = db_emp_id
                    
                    supabase_client.table("activity_logs").insert({
                        "employee_id": db_emp_id,
                        "process_name": "Logout",
                        "window_title": "Shift Ended",
                        "domain_url": None,
                        "category": "NEUTRAL",
                        "is_idle": False,
                        "duration_seconds": 0
                    }).execute()
                except Exception as db_err:
                    print(f"Supabase persistence error on logout: {db_err}")
            
            return {
                "employee": emp,
                "log": {
                    "id": str(uuid.uuid4()),
                    "employee_code": email,
                    "process_name": "Logout",
                    "window_title": "Shift Ended",
                    "display_name": "Logout",
                    "category": "NEUTRAL",
                    "is_idle": False,
                    "duration_seconds": 0,
                    "timestamp": now_iso
                },
                "category": "NEUTRAL",
                "display_name": "Logout"
            }

        # Determine live status
        if is_idle:
            status = "IDLE"
            emp["total_idle_seconds"] += interval
        elif category == "ENTERTAINMENT":
            status = "ENTERTAINMENT_ALERT"
            emp["total_active_seconds"] += interval
            if "youtube" in (url or "").lower() or "youtube" in win_title.lower():
                emp["youtube_seconds"] += interval
            emp["unproductive_seconds"] += interval
        elif category == "CORE_WORK":
            status = "ACTIVE"
            emp["total_active_seconds"] += interval
            emp["control_id_seconds"] += interval
        else: # PRODUCTIVE or NEUTRAL
            status = "ACTIVE"
            emp["total_active_seconds"] += interval
            if category == "PRODUCTIVE":
                emp["other_productive_seconds"] += interval

        # Update dynamic application durations for digital wellbeing
        if "app_durations" not in emp:
            emp["app_durations"] = {}
        app_key = "Idle / Away" if is_idle else (display_name or proc_name or "Unknown Application")
        emp["app_durations"][app_key] = emp["app_durations"].get(app_key, 0) + interval

        # Update live state
        emp["current_status"] = status
        emp["current_process"] = proc_name
        emp["current_window_title"] = win_title
        emp["current_url"] = url
        emp["current_category"] = category
        emp["current_app_display"] = display_name
        emp["last_heartbeat"] = now_iso

        # Calculate productivity score: (Control ID + Other Productive) / Total Active * 100
        total_active = emp["total_active_seconds"]
        if total_active > 0:
            prod_seconds = emp["control_id_seconds"] + emp["other_productive_seconds"]
            emp["productivity_score"] = round((prod_seconds / total_active) * 100, 1)

        # Check for alert trigger (> 30 min continuous YouTube)
        if emp["youtube_seconds"] > 20 and not any(a["employee_code"] == email and a["alert_type"] == "EXCESSIVE_ENTERTAINMENT" and not a.get("is_resolved", False) for a in self.alerts):
            secs_total = emp["youtube_seconds"]
            duration_str = f"{secs_total} secs" if secs_total < 60 else f"{round(secs_total/60)} mins"
            self.alerts.insert(0, {
                "id": str(uuid.uuid4()),
                "employee_code": email,
                "employee_name": emp["full_name"],
                "alert_type": "EXCESSIVE_ENTERTAINMENT",
                "message": f"Excessive YouTube activity detected: {duration_str} total.",
                "severity": "HIGH",
                "timestamp": now_iso,
                "is_resolved": False
            })

        # Append to log history
        log_entry = {
            "id": str(uuid.uuid4()),
            "employee_code": email,
            "process_name": proc_name,
            "window_title": win_title,
            "display_name": display_name,
            "category": category,
            "is_idle": is_idle,
            "duration_seconds": interval,
            "timestamp": now_iso
        }
        self.activity_logs.append(log_entry)
        
        # Persist to Supabase if connected
        if supabase_client is not None:
            try:
                # 1. Upsert Employee profile details and fetch the database UUID
                res = supabase_client.table("employees").upsert({
                    "full_name": emp["full_name"],
                    "email": emp["email"],
                    "role": emp["role"]
                }, on_conflict="email").execute()
                
                db_emp_id = None
                if hasattr(res, 'data') and res.data:
                    db_emp_id = res.data[0]["id"]
                    emp["id"] = db_emp_id # Update local memory with true UUID
                
                # 2. Insert Activity Log record linked to employee
                supabase_client.table("activity_logs").insert({
                    "employee_id": db_emp_id,
                    "process_name": proc_name,
                    "window_title": win_title,
                    "domain_url": url,
                    "category": category,
                    "is_idle": is_idle,
                    "duration_seconds": interval
                }).execute()
            except Exception as db_err:
                print(f"Supabase persistence error: {db_err}")
        
        # Periodic check to purge records older than 30 days
        if len(self.activity_logs) % 100 == 0:
            self.clean_old_logs()

        return {
            "employee": emp,
            "log": log_entry,
            "category": category,
            "display_name": display_name
        }

    def clean_old_logs(self):
        """Removes log records older than 30 days to enforce rolling data retention"""
        from datetime import timedelta
        cutoff = datetime.utcnow() - timedelta(days=30)
        
        valid_logs = []
        for log in self.activity_logs:
            try:
                # Strip Z zone designator for isoformat parsing
                ts_str = log["timestamp"].replace("Z", "")
                log_time = datetime.fromisoformat(ts_str)
                if log_time >= cutoff:
                    valid_logs.append(log)
            except Exception:
                valid_logs.append(log) # Keep log if parsing fails to prevent data loss
        self.activity_logs = valid_logs

    def get_summary_stats(self) -> Dict[str, Any]:
        total_emps = len(self.employees)
        active_now = sum(1 for e in self.employees.values() if e["current_status"] in ["ACTIVE", "ENTERTAINMENT_ALERT"])
        idle_now = sum(1 for e in self.employees.values() if e["current_status"] == "IDLE")
        entertainment_now = sum(1 for e in self.employees.values() if e["current_status"] == "ENTERTAINMENT_ALERT")
        
        total_control_id_sec = sum(e["control_id_seconds"] for e in self.employees.values())
        total_youtube_sec = sum(e["youtube_seconds"] for e in self.employees.values())
        total_other_prod_sec = sum(e["other_productive_seconds"] for e in self.employees.values())
        total_idle_sec = sum(e["total_idle_seconds"] for e in self.employees.values())
        
        avg_prod_score = round(sum(e["productivity_score"] for e in self.employees.values()) / max(total_emps, 1), 1)

        return {
            "total_employees": total_emps,
            "active_now": active_now,
            "idle_now": idle_now,
            "entertainment_alert_now": entertainment_now,
            "total_control_id_hours": round(total_control_id_sec / 3600, 2),
            "total_youtube_hours": round(total_youtube_sec / 3600, 2),
            "total_other_productive_hours": round(total_other_prod_sec / 3600, 2),
            "total_idle_hours": round(total_idle_sec / 3600, 2),
            "average_productivity_score": avg_prod_score
        }

aggregator = DataAggregator()
