import time
import json
import logging
import requests
import os
import sys
import threading
import hmac
import hashlib
import tkinter as tk
from tkinter import messagebox, ttk
from datetime import datetime

from trackers.window_tracker import WindowTracker
from trackers.idle_tracker import IdleTracker
from storage.local_cache import OfflineBuffer

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("MonitoringAgent")

class EmployeeMonitoringAgent:
    def __init__(self, config_path: str = "config.json"):
        self.config_path = config_path
        self.config = self._load_config(config_path)
        self.window_tracker = WindowTracker()
        self.idle_tracker = IdleTracker(idle_threshold_seconds=self.config.get("idle_threshold_seconds", 180))
        self.cache = OfflineBuffer()
        
        # State tracking
        self.is_tracking = False
        self.on_break = False
        self.tracking_thread = None
        self.employee_code = ""
        self.employee_name = ""
        self.employee_email = ""
        self.employee_role = ""
        self.session_seconds = 0
        
        # GUI elements
        self.root = None
        self.login_frame = None
        self.active_frame = None
        self.status_label = None
        self.activity_label = None
        self.timer_label = None
        self.break_btn = None

    def _load_config(self, path: str):
        if os.path.exists(path):
            with open(path, "r") as f:
                try:
                    return json.load(f)
                except Exception:
                    pass
        return {
            "employee_code": "",
            "device_id": "WIN-DESKTOP-CLIENT",
            "server_url": "http://127.0.0.1:8000/api/telemetry/heartbeat",
            "heartbeat_interval_seconds": 5,
            "idle_threshold_seconds": 180
        }

    def _save_config(self):
        try:
            with open(self.config_path, "w") as f:
                json.dump(self.config, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save config: {e}")

    def tracking_loop(self):
        """Asynchronous tracking background loop"""
        interval = self.config.get("heartbeat_interval_seconds", 5)
        logger.info(f"Telemetry tracking thread started for {self.employee_code}")

        while self.is_tracking:
            try:
                if self.on_break:
                    # During lunch/break, send structured break heartbeat (privacy safe)
                    payload = {
                        "full_name": self.employee_name,
                        "email": self.employee_email,
                        "role": self.employee_role,
                        "device_id": self.config.get("device_id", "CLIENT"),
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                        "interval_seconds": interval,
                        "process_name": "Lunch Break",
                        "window_title": "Employee on Lunch Break",
                        "active_url": None,
                        "is_idle": True,
                        "idle_duration_seconds": interval
                    }
                    self.update_gui_activity("Lunch Break", "Active tracking paused")
                else:
                    # Standard active tracking
                    win_info = self.window_tracker.get_active_window()
                    is_idle, idle_secs = self.idle_tracker.is_user_idle()

                    payload = {
                        "full_name": self.employee_name,
                        "email": self.employee_email,
                        "role": self.employee_role,
                        "device_id": self.config.get("device_id", "CLIENT"),
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                        "interval_seconds": interval,
                        "process_name": win_info["process_name"],
                        "window_title": win_info["window_title"],
                        "active_url": None,
                        "is_idle": is_idle,
                        "idle_duration_seconds": idle_secs
                    }
                    
                    app_name = "Idle / Away" if is_idle else win_info["process_name"]
                    self.update_gui_activity(app_name, win_info["window_title"])

                # Transmit to ingestion server with secure cryptographic signature
                try:
                    resp = self.send_signed_heartbeat(payload)
                    if resp.status_code == 200:
                        self.sync_offline_cache()
                    else:
                        self.cache.enqueue(payload)
                except Exception:
                    self.cache.enqueue(payload)

            except Exception as e:
                logger.error(f"Error in tracking loop: {e}")

            time.sleep(interval)
            self.session_seconds += interval

    def sync_offline_cache(self):
        pending = self.cache.fetch_pending(limit=20)
        if not pending:
            return
        synced_ids = []
        for item in pending:
            try:
                resp = self.send_signed_heartbeat(item["payload"])
                if resp.status_code == 200:
                    synced_ids.append(item["row_id"])
            except Exception:
                break
        if synced_ids:
            self.cache.delete_synced(synced_ids)

    def send_signed_heartbeat(self, payload):
        """Generates an HMAC-SHA256 signature for the heartbeat and returns the HTTP post request"""
        secret = self.config.get("api_secret_key") or os.environ.get("API_SECRET_KEY")
        if not secret:
            raise RuntimeError(
                "api_secret_key is not set in config.json (or API_SECRET_KEY env var). "
                "This must match the backend's API_SECRET_KEY exactly. Refusing to send "
                "an unsigned/insecurely-signed heartbeat."
            )
        ts = payload["timestamp"]
        proc = payload["process_name"]
        
        # Compute signature token (using email + timestamp + process_name)
        msg = f"{payload['email']}:{ts}:{proc}".encode('utf-8')
        sig = hmac.new(secret.encode('utf-8'), msg, hashlib.sha256).hexdigest()
        
        headers = {
            "X-Signature": sig,
            "X-Timestamp": ts
        }
        return requests.post(self.config["server_url"], json=payload, headers=headers, timeout=3)

    # =========================================================================
    # GUI IMPLEMENTATION (Tkinter Dark Theme)
    # =========================================================================

    def setup_gui(self):
        self.root = tk.Tk()
        self.root.title("ControlSense Tracker")
        self.root.geometry("380x420")
        self.root.configure(bg="#0f172a") # Dark Slate Theme
        self.root.resizable(False, False)
        
        # Header title
        header = tk.Label(
            self.root, text="CONTROLSENSE", 
            font=("Helvetica", 14, "bold"), fg="#10b981", bg="#0f172a"
        )
        header.pack(pady=(20, 5))
        
        subtitle = tk.Label(
            self.root, text="Enterprise Tracking Client", 
            font=("Helvetica", 9), fg="#64748b", bg="#0f172a"
        )
        subtitle.pack(pady=(0, 20))

        # Check for saved employee code to auto-populate
        saved_code = self.config.get("employee_code", "")
        
        self.build_login_screen(saved_code)
        
        self.root.protocol("WM_DELETE_WINDOW", self.on_close_window)
        self.root.mainloop()

    def build_login_screen(self, prefill_code=""):
        if self.active_frame:
            self.active_frame.destroy()

        self.login_frame = tk.Frame(self.root, bg="#0f172a")
        self.login_frame.pack(fill="both", expand=True, padx=30)

        # Style dropdown
        style = ttk.Style()
        style.theme_use('clam')
        style.configure("TCombobox", fieldbackground="#1e293b", background="#1e293b", foreground="#f8fafc", arrowcolor="#10b981", borderwidth=0, relief="flat")
        self.root.option_add('*TCombobox*Listbox.background', '#1e293b')
        self.root.option_add('*TCombobox*Listbox.foreground', '#f8fafc')
        self.root.option_add('*TCombobox*Listbox.selectBackground', '#10b981')
        self.root.option_add('*TCombobox*Listbox.selectForeground', '#ffffff')

        # Name Input
        lbl = tk.Label(
            self.login_frame, text="Enter Employee Name:", 
            font=("Helvetica", 10), fg="#94a3b8", bg="#0f172a"
        )
        lbl.pack(anchor="w", pady=(0, 5))

        self.code_entry = tk.Entry(
            self.login_frame, font=("Helvetica", 11), 
            bg="#1e293b", fg="#f8fafc", insertbackground="#f8fafc",
            relief="flat", borderwidth=8
        )
        self.code_entry.pack(fill="x", pady=(0, 10))
        saved_name = self.config.get("employee_name", "")
        if saved_name:
            self.code_entry.insert(0, saved_name)

        # Email Input
        lbl_email = tk.Label(
            self.login_frame, text="Enter Employee Email:", 
            font=("Helvetica", 10), fg="#94a3b8", bg="#0f172a"
        )
        lbl_email.pack(anchor="w", pady=(0, 5))

        self.email_entry = tk.Entry(
            self.login_frame, font=("Helvetica", 11), 
            bg="#1e293b", fg="#f8fafc", insertbackground="#f8fafc",
            relief="flat", borderwidth=8
        )
        self.email_entry.pack(fill="x", pady=(0, 10))
        saved_email = self.config.get("email", "")
        if saved_email:
            self.email_entry.insert(0, saved_email)

        # Dropdown selection for Position/Role
        lbl_role = tk.Label(
            self.login_frame, text="Select Position / Role:", 
            font=("Helvetica", 10), fg="#94a3b8", bg="#0f172a"
        )
        lbl_role.pack(anchor="w", pady=(0, 5))

        self.role_var = tk.StringVar()
        self.role_combo = ttk.Combobox(
            self.login_frame, textvariable=self.role_var,
            font=("Helvetica", 10), state="readonly"
        )
        self.role_combo['values'] = (
            'Developer', 
            'Designer', 
            'Data Entry Operator', 
            'QA Engineer', 
            'Content Writer', 
            'Support Executive', 
            'Manager'
        )
        saved_role = self.config.get("role", "Developer")
        if saved_role in self.role_combo['values']:
            self.role_combo.set(saved_role)
        else:
            self.role_combo.set('Developer')
        self.role_combo.pack(fill="x", pady=(0, 20))

        # Start Shift button
        login_btn = tk.Button(
            self.login_frame, text="Log In / Start Shift",
            font=("Helvetica", 11, "bold"), bg="#10b981", fg="#ffffff",
            activebackground="#059669", activeforeground="#ffffff",
            relief="flat", cursor="hand2", command=self.handle_login
        )
        login_btn.pack(fill="x", ipady=6)

    def build_active_screen(self):
        if self.login_frame:
            self.login_frame.destroy()

        self.active_frame = tk.Frame(self.root, bg="#0f172a")
        self.active_frame.pack(fill="both", expand=True, padx=30)

        # Status text
        self.status_label = tk.Label(
            self.active_frame, text=f"Employee: {self.employee_code}",
            font=("Helvetica", 10, "bold"), fg="#38bdf8", bg="#0f172a"
        )
        self.status_label.pack(anchor="w", pady=(0, 10))

        # Live Clock Timer
        self.timer_label = tk.Label(
            self.active_frame, text="Shift Time: 00:00:00",
            font=("Courier New", 14, "bold"), fg="#f8fafc", bg="#0f172a"
        )
        self.timer_label.pack(pady=10)

        # Active App Info
        app_box = tk.Frame(self.active_frame, bg="#1e293b", bd=1, relief="solid")
        app_box.pack(fill="x", pady=(0, 20), ipady=5)
        
        self.activity_label = tk.Label(
            app_box, text="Current app: Starting...",
            font=("Helvetica", 9), fg="#94a3b8", bg="#1e293b",
            wraplength=300
        )
        self.activity_label.pack(padx=10, pady=5)

        # Buttons Panel
        btn_panel = tk.Frame(self.active_frame, bg="#0f172a")
        btn_panel.pack(fill="x")

        self.break_btn = tk.Button(
            btn_panel, text="Lunch / Break",
            font=("Helvetica", 10, "bold"), bg="#f59e0b", fg="#ffffff",
            activebackground="#d97706", activeforeground="#ffffff",
            relief="flat", cursor="hand2", command=self.toggle_break
        )
        self.break_btn.pack(side="left", fill="x", expand=True, padx=(0, 5), ipady=6)

        logout_btn = tk.Button(
            btn_panel, text="End Shift",
            font=("Helvetica", 10, "bold"), bg="#f43f5e", fg="#ffffff",
            activebackground="#e11d48", activeforeground="#ffffff",
            relief="flat", cursor="hand2", command=self.handle_logout
        )
        logout_btn.pack(side="right", fill="x", expand=True, padx=(5, 0), ipady=6)

        # Start background GUI timer tick
        self.update_gui_timer()

    def handle_login(self):
        name = self.code_entry.get().strip().title()
        email = self.email_entry.get().strip().lower()
        role = self.role_combo.get()
        
        if not name:
            messagebox.showerror("Error", "Please enter a valid Employee Name.")
            return
            
        if not email or "@" not in email:
            messagebox.showerror("Error", "Please enter a valid Corporate Email address.")
            return

        self.employee_code = email  # email serves as the unique identifier key
        self.employee_name = name
        self.employee_email = email
        self.employee_role = role
        
        self.config["employee_code"] = email
        self.config["employee_name"] = name
        self.config["email"] = email
        self.config["role"] = role
        self._save_config()

        # Start tracking thread
        self.is_tracking = True
        self.on_break = False
        self.session_seconds = 0
        
        self.tracking_thread = threading.Thread(target=self.tracking_loop, daemon=True)
        self.tracking_thread.start()

        self.build_active_screen()

    def toggle_break(self):
        self.on_break = not self.on_break
        if self.on_break:
            self.break_btn.configure(text="Resume Work", bg="#10b981", activebackground="#059669")
            self.status_label.configure(text=f"Logged In: {self.employee_code} (ON BREAK)", fg="#f59e0b")
        else:
            self.break_btn.configure(text="Lunch / Break", bg="#f59e0b", activebackground="#d97706")
            self.status_label.configure(text=f"Logged In: {self.employee_code}", fg="#38bdf8")

    def handle_logout(self):
        if messagebox.askyesno("Confirm", "Are you sure you want to end your shift and log out?"):
            self.shutdown_agent()

    def shutdown_agent(self):
        self.is_tracking = False
        # Exit application
        if self.root:
            self.root.destroy()
        sys.exit(0)

    def on_close_window(self):
        if self.is_tracking:
            if messagebox.askyesno("Exit", "Closing this window will end your shift. Do you want to log out?"):
                self.shutdown_agent()
        else:
            self.shutdown_agent()

    def update_gui_activity(self, app_name, title_text):
        if self.root and self.activity_label:
            self.root.after(0, lambda: self.activity_label.configure(
                text=f"Current: {app_name}\n{title_text[:60]}"
            ))

    def update_gui_timer(self):
        if self.is_tracking and self.root and self.timer_label:
            h = self.session_seconds // 3600
            m = (self.session_seconds % 3600) // 60
            s = self.session_seconds % 60
            timer_str = f"Shift Time: {h:02d}:{m:02d}:{s:02d}"
            self.timer_label.configure(text=timer_str)
            self.root.after(1000, self.update_gui_timer)

if __name__ == "__main__":
    agent = EmployeeMonitoringAgent()
    agent.setup_gui()
