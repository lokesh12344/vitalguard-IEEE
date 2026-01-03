from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.models.alert import AlertType, AlertSeverity


class AlertResponse(BaseModel):
    id: int
    patient_id: int
    patient_name: Optional[str] = None
    alert_type: AlertType
    severity: AlertSeverity
    message: str
    vital_type: Optional[str] = None
    vital_value: Optional[float] = None
    threshold_breached: Optional[float] = None
    is_acknowledged: bool
    acknowledged_by: Optional[int] = None
    acknowledged_at: Optional[datetime] = None
    notification_sent: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class AlertAcknowledge(BaseModel):
    notes: Optional[str] = None


class AlertListResponse(BaseModel):
    alerts: List[AlertResponse]
    total: int
    unacknowledged_count: int


class AlertStats(BaseModel):
    total_alerts: int
    critical_count: int
    warning_count: int
    unacknowledged_count: int
    alerts_today: int
