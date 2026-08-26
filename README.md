# Enterprise Employee Monitoring & Productivity Intelligence Tool

A full-stack employee monitoring solution that tracks active application windows, measures utilization of core work tools (like the **Control ID Tool**), detects non-work distractions (like **YouTube**), computes active vs. idle time, and streams real-time telemetry to an interactive, login-protected web dashboard.

---

## System Architecture

```
Employee monitoring tool/
├── database/               # Supabase / PostgreSQL schemas & seed rules
│   ├── schema.sql          # Core tables: employees, work_sessions, activity_logs, daily_summaries
│   └── seed.sql            # Seed rules for Control ID Tool, YouTube, Dev IDEs
├── backend/                # FastAPI Realtime Ingestion & Analytics Server
│   ├── main.py             # REST APIs + WebSockets (/ws/live)
│   ├── auth.py             # Admin login (JWT) + password hashing
│   ├── models.py           # Pydantic data contracts
│   ├── services/           # Classification, Aggregation, WebSocket Hub
│   └── tests/              # Pytest unit tests
├── scripts/
│   └── generate_password_hash.py   # Generates the admin password hash for .env
├── desktop_agent/          # Python Cross-Platform Client Agent
│   ├── agent.py            # Win32 & macOS window & idle tracker daemon
│   └── config.json         # Agent settings & server endpoints (incl. shared secret)
├── browser_extension/      # Chrome/Edge Companion Extension
│   ├── manifest.json       # Manifest V3 extension
│   └── background.js       # Active tab & URL sniffer
├── frontend/                # Admin Web Portal (React + Vite + Tailwind CSS)
│   ├── src/components/     # Login, LiveMonitor, ProductivityStats, ActivityTimeline, Alerts
│   └── src/services/       # auth.js, Realtime WebSocket & REST clients
└── .github/workflows/ci.yml # Lint + test on every push/PR
```

---

## 🔐 Security setup (do this before running anything)

This project ships **without** any secrets or default passwords baked in — you generate your own.

### 1. Backend `.env`

```bash
cd backend
cp .env.example .env
```

Fill in `backend/.env`:

| Variable | How to generate |
|---|---|
| `API_SECRET_KEY` | `python -c "import secrets; print(secrets.token_hex(32))"` — shared secret between backend and every desktop agent |
| `JWT_SECRET_KEY` | `python -c "import secrets; print(secrets.token_hex(32))"` — signs admin login sessions |
| `ADMIN_USERNAME` | pick anything, e.g. `admin` |
| `ADMIN_PASSWORD_HASH` | run `python ../scripts/generate_password_hash.py` and paste the output |
| `CORS_ORIGINS` | the URL(s) your dashboard is served from, comma-separated |
| `SUPABASE_URL` / `SUPABASE_KEY` | optional — omit to run fully in-memory |

### 2. Desktop agent `config.json`

Set `api_secret_key` in `desktop_agent/config.json` to the **exact same value** as `API_SECRET_KEY` in `backend/.env`. If they don't match, the backend will reject every heartbeat with `401 Unauthorized` (this is intentional — it means someone can't run a rogue agent against your server).

Never commit a `config.json` with a real secret filled in — treat it like `.env`.

---

## 🚀 Quick Start Guide

### 1. Start the Backend API Server
```bash
cd backend
pip install -r requirements.txt
python main.py
```
* Backend REST API: `http://127.0.0.1:8000`
* Swagger docs: `http://127.0.0.1:8000/docs`
* WebSocket: `ws://127.0.0.1:8000/ws/live?token=<jwt>`

### 2. Start the Admin Web Dashboard
```bash
cd frontend
npm install
npm run dev
```
* Open `http://localhost:5173` and log in with the admin username/password you set above.

### 3. Run the Desktop Monitoring Agent (Employee Machine)
```bash
cd desktop_agent
pip install -r requirements.txt
python agent.py
```
The agent tracks active windows and idle time on Windows/macOS and sends signed telemetry every 5 seconds. It requires `api_secret_key` to be set in `config.json` — it will refuse to run without it.

---

## ✅ Running tests

```bash
cd backend
pip install -r requirements-dev.txt
pytest tests/ -v
```

CI (`.github/workflows/ci.yml`) runs these same tests plus a frontend build on every push and pull request to `main`.

---

## 🔒 Notes on the security model

- **Admin dashboard** (`/api/employees`, `/api/analytics/*`, `/api/alerts*`, `/ws/live`): protected by a JWT obtained via `/api/auth/login`. Tokens expire after `ACCESS_TOKEN_EXPIRE_MINUTES` (default 8 hours).
- **Telemetry ingestion** (`/api/telemetry/heartbeat`): protected by an HMAC-SHA256 signature + timestamp (90-second replay window), signed with `API_SECRET_KEY`. This is a *shared secret* baked into every desktop agent install — it stops random internet traffic from injecting fake data, but it is not a substitute for network-level access control (firewall/VPN) if you deploy this beyond localhost, since a sufficiently motivated employee with access to their own agent's config file can extract the secret.
- Always run this behind HTTPS/WSS in any real deployment — plain HTTP leaks the JWT and HMAC secret on the wire.

## ⚖️ Before deploying this for real employees

Employee monitoring software carries real legal and ethical obligations that vary by jurisdiction (many require advance written notice or consent, and restrict what can be captured off-hours or on personal devices). Check applicable local/state/national law and your company's policies before deployment, and make sure affected employees are clearly informed.
