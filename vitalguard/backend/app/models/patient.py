import enum
from datetime import datetime, date
from sqlalchemy import String, Integer, ForeignKey, DateTime, Date, Text, Enum, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class RiskLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Patient(Base):
    __tablename__ = "patients"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    date_of_birth: Mapped[date] = mapped_column(Date, nullable=False)
    gender: Mapped[str] = mapped_column(String(20), nullable=True)
    blood_type: Mapped[str] = mapped_column(String(5), nullable=True)
    emergency_contact_name: Mapped[str] = mapped_column(String(255), nullable=True)
    emergency_contact_phone: Mapped[str] = mapped_column(String(20), nullable=True)
    primary_doctor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=True)
    caregiver_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=True)
    discharge_date: Mapped[date] = mapped_column(Date, nullable=True)
    condition_summary: Mapped[str] = mapped_column(Text, nullable=True)
    risk_level: Mapped[RiskLevel] = mapped_column(Enum(RiskLevel), default=RiskLevel.MEDIUM)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id], back_populates="patient_profile")
    primary_doctor: Mapped["User"] = relationship("User", foreign_keys=[primary_doctor_id])
    caregiver: Mapped["User"] = relationship("User", foreign_keys=[caregiver_id])
    vital_readings: Mapped[list["VitalReading"]] = relationship("VitalReading", back_populates="patient")
    medications: Mapped[list["Medication"]] = relationship("Medication", back_populates="patient")
    alerts: Mapped[list["Alert"]] = relationship("Alert", back_populates="patient")
    alert_thresholds: Mapped[list["AlertThreshold"]] = relationship("AlertThreshold", back_populates="patient")
    
    @property
    def age(self) -> int:
        today = date.today()
        return today.year - self.date_of_birth.year - (
            (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
        )
    
    def __repr__(self):
        return f"<Patient {self.id} - User {self.user_id}>"


class AlertThreshold(Base):
    __tablename__ = "alert_thresholds"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), nullable=False)
    vital_type: Mapped[str] = mapped_column(String(50), nullable=False)  # heart_rate, spo2, temperature
    min_warning: Mapped[float] = mapped_column(Float, nullable=True)
    max_warning: Mapped[float] = mapped_column(Float, nullable=True)
    min_critical: Mapped[float] = mapped_column(Float, nullable=True)
    max_critical: Mapped[float] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    patient: Mapped["Patient"] = relationship("Patient", back_populates="alert_thresholds")
    
    def __repr__(self):
        return f"<AlertThreshold {self.vital_type} for Patient {self.patient_id}>"


# Import here to avoid circular imports
from app.models.vital import VitalReading
from app.models.medication import Medication
from app.models.alert import Alert
