import enum
from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, DateTime, Text, Enum, Boolean, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import ARRAY
from app.database import Base


class AlertSeverity(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"


class AlertType(str, enum.Enum):
    VITAL_WARNING = "vital_warning"
    VITAL_CRITICAL = "vital_critical"
    MEDICATION_MISSED = "medication_missed"
    ANOMALY_DETECTED = "anomaly_detected"


class Alert(Base):
    __tablename__ = "alerts"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), nullable=False, index=True)
    vital_reading_id: Mapped[int] = mapped_column(ForeignKey("vital_readings.id"), nullable=True)
    
    alert_type: Mapped[AlertType] = mapped_column(Enum(AlertType), nullable=False)
    severity: Mapped[AlertSeverity] = mapped_column(Enum(AlertSeverity), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    
    vital_type: Mapped[str] = mapped_column(String(50), nullable=True)  # heart_rate, spo2, temperature
    vital_value: Mapped[float] = mapped_column(Float, nullable=True)
    threshold_breached: Mapped[float] = mapped_column(Float, nullable=True)
    
    is_acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)
    acknowledged_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=True)
    acknowledged_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    
    notification_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    notification_channels: Mapped[str] = mapped_column(String(255), nullable=True)  # JSON array
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    patient: Mapped["Patient"] = relationship("Patient", back_populates="alerts")
    
    def __repr__(self):
        return f"<Alert {self.id} - {self.alert_type.value} ({self.severity.value})>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "alert_type": self.alert_type.value,
            "severity": self.severity.value,
            "message": self.message,
            "vital_type": self.vital_type,
            "vital_value": self.vital_value,
            "threshold_breached": self.threshold_breached,
            "is_acknowledged": self.is_acknowledged,
            "acknowledged_at": self.acknowledged_at.isoformat() if self.acknowledged_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else datetime.utcnow().isoformat(),
        }


# Import to avoid circular import
from app.models.patient import Patient
