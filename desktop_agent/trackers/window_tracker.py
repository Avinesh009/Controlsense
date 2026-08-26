import sys
import os
from typing import Dict, Any, Optional

class WindowTracker:
    def __init__(self):
        self.os_type = sys.platform
        self._init_os_handlers()

    def _init_os_handlers(self):
        if self.os_type == "win32":
            try:
                import win32gui
                import win32process
                import win32api
                import win32con
                self.win32gui = win32gui
                self.win32process = win32process
                self.win32api = win32api
                self.win32con = win32con
                self.has_win32 = True
            except ImportError:
                self.has_win32 = False
        else:
            self.has_win32 = False

    def get_active_window(self) -> Dict[str, Any]:
        """
        Returns a dictionary containing:
        - process_name: e.g. 'ControlID.exe', 'chrome.exe'
        - window_title: e.g. 'Control ID Tool - Quality Check', 'YouTube - Google Chrome'
        - os: 'win32' | 'darwin' | 'linux'
        """
        if self.os_type == "win32" and self.has_win32:
            try:
                hwnd = self.win32gui.GetForegroundWindow()
                if not hwnd:
                    return {"process_name": "Desktop", "window_title": "Windows Desktop", "os": "win32"}

                title = self.win32gui.GetWindowText(hwnd)
                _, pid = self.win32process.GetWindowThreadProcessId(hwnd)

                process_name = "Unknown.exe"
                try:
                    # Open process handle to query name
                    handle = self.win32api.OpenProcess(
                        self.win32con.PROCESS_QUERY_INFORMATION | self.win32con.PROCESS_VM_READ,
                        False, pid
                    )
                    import win32process
                    exe_name = win32process.GetModuleFileNameEx(handle, 0)
                    process_name = os.path.basename(exe_name)
                    self.win32api.CloseHandle(handle)
                except Exception:
                    # Fallback process name heuristics
                    process_name = "Application.exe"

                return {
                    "process_name": process_name,
                    "window_title": title or process_name,
                    "os": "win32"
                }
            except Exception as e:
                return {"process_name": "Unknown", "window_title": f"Error: {e}", "os": "win32"}

        elif self.os_type == "darwin":
            try:
                from AppKit import NSWorkspace
                active_app = NSWorkspace.sharedWorkspace().frontmostApplication()
                app_name = active_app.localizedName() if active_app else "Unknown"
                return {
                    "process_name": app_name,
                    "window_title": app_name,
                    "os": "darwin"
                }
            except Exception:
                return {"process_name": "macOS App", "window_title": "Active Window", "os": "darwin"}

        # Generic fallback
        return {
            "process_name": "Workstation Process",
            "window_title": "Active Desktop Window",
            "os": self.os_type
        }
