import sys
import time
from typing import Tuple

class IdleTracker:
    def __init__(self, idle_threshold_seconds: int = 180):
        self.idle_threshold_seconds = idle_threshold_seconds
        self.os_type = sys.platform
        self.last_activity_time = time.time()
        self._init_os_handlers()

    def _init_os_handlers(self):
        if self.os_type == "win32":
            try:
                import ctypes
                import win32api
                self.ctypes = ctypes
                self.win32api = win32api
                self.has_win32 = True
            except ImportError:
                self.has_win32 = False
        else:
            self.has_win32 = False

    def get_idle_seconds(self) -> float:
        """
        Returns the number of seconds since the user last moved the mouse or pressed a key.
        Uses native Windows GetLastInputInfo API for 0% CPU overhead.
        """
        if self.os_type == "win32" and self.has_win32:
            try:
                class LASTINPUTINFO(self.ctypes.Structure):
                    _fields_ = [
                        ("cbSize", self.ctypes.c_uint),
                        ("dwTime", self.ctypes.c_uint)
                    ]
                
                lii = LASTINPUTINFO()
                lii.cbSize = self.ctypes.sizeof(LASTINPUTINFO)
                
                if self.ctypes.windll.user32.GetLastInputInfo(self.ctypes.byref(lii)):
                    millis_since_boot = self.win32api.GetTickCount()
                    idle_millis = millis_since_boot - lii.dwTime
                    return max(0.0, idle_millis / 1000.0)
            except Exception:
                pass

        # Fallback simulation
        return max(0.0, time.time() - self.last_activity_time)

    def is_user_idle(self) -> Tuple[bool, int]:
        """
        Returns (is_idle: bool, idle_duration_seconds: int)
        """
        idle_sec = int(self.get_idle_seconds())
        return (idle_sec >= self.idle_threshold_seconds, idle_sec)
