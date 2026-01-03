import enum
from datetime import datetime, time
from sqlalchemy import String, Integer, ForeignKey, DateTime, Date, Text, Enum, Boolean, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import ARRAY
from app.database import Base


class MedicationStatus(str, enum.Enum):
    PENDING = "pending"
    TAKEN = "taken"
    MISSED = "missed"
    SKIPPED = "skipped"


class Medication(Base):
    __tablename__ = "medications"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    dosage: Mapped[str] = mapped_column(String(100), nullable=True)
    frequency: Mapped[str] = mapped_column(String(100), nullable=True)  # e.g., "twice daily"
    schedule_times: Mapped[str] = mapped_column(String(255), nullable=True)  # JSON array of times
    start_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    end_date: Mapped[datetime] = mapped_column(Date, nullable=True)
    instructions: Mapped[str] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    patient: Mapped["Patient"] = relationship("Patient", back_populates="medications")
    logs: Mapped[list["MedicationLog"]] = relationship("MedicationLog", back_populates="medication")
    
    def __repr__(self):
        return f"<Medication {self.name} for Patient {self.patient_id}>"


class MedicationLog(Base):
    __tablename__ = "medication_logs"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    medication_id: Mapped[int] = mapped_column(ForeignKey("medications.id"), nullable=False)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), nullable=False)
    scheduled_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    taken_time: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    status: Mapped[MedicationStatus] = mapped_column(Enum(MedicationStatus), default=MedicationStatus.PENDING)
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    logged_via: Mapped[str] = mapped_column(String(50), default="app")  # app, voice, caregiver
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    medication: Mapped["Medication"] = relationship("Medication", back_populates="logs")
    
    def __repr__(self):
        return f"<MedicationLog {self.id} - {self.status.value}>"


# Import to avoid circular import
from app.models.patient import Patient
