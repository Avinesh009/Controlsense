from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

class TelemetryPayload(BaseModel):
    device_id: str = Field(..., example="WIN-DEV-001")
    session_id: Optional[str] = Field(None, example="SES-20260810-001")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    interval_seconds: int = Field(default=5, description="Seconds captured in this heartbeat")
    role: Optional[str] = Field(None, example="Developer")
    email: str = Field(..., example="john@company.com")
    full_name: str = Field(..., example="John Doe")
    
    # Activity details
    process_name: str = Field(..., example="ControlID.exe")
    window_title: str = Field(..., example="Control ID Tool - Inspection #421")
    active_url: Optional[str] = Field(None, example="https://www.youtube.com/watch?v=123")
    
    # Idle & Input velocity
    is_idle: bool = Field(default=False)
    idle_duration_seconds: int = Field(default=0)
    input_velocity: Optional[Dict[str, int]] = Field(default_factory=dict) # e.g. {"clicks": 2, "keystrokes": 30}

class EmployeeStatus(BaseModel):
    id: str
    full_name: str
    email: str
    role: str
    
    # Live state
    current_status: str = "OFFLINE" # "ACTIVE", "IDLE", "ENTERTAINMENT_ALERT", "OFFLINE"
    current_process: Optional[str] = None
    current_window_title: Optional[str] = None
    current_url: Optional[str] = None
    current_category: Optional[str] = None
    last_heartbeat: Optional[datetime] = None
    
    # Today's metrics (in seconds)
    total_active_seconds: int = 0
    total_idle_seconds: int = 0
    control_id_seconds: int = 0
    youtube_seconds: int = 0
    other_productive_seconds: int = 0
    unproductive_seconds: int = 0
    productivity_score: float = 0.0

class CategoryRule(BaseModel):
    pattern: str
    match_type: str # 'PROCESS', 'DOMAIN', 'TITLE'
    category: str   # 'CORE_WORK', 'PRODUCTIVE', 'ENTERTAINMENT', 'NEUTRAL'
    display_name: str
    productivity_weight: int

class SystemAlert(BaseModel):
    id: str
    employee_code: str
    employee_name: str
    alert_type: str
    message: str
    severity: str # 'LOW', 'MEDIUM', 'HIGH'
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    is_resolved: bool = False
