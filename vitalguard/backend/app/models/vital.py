from datetime import datetime
from sqlalchemy import Integer, ForeignKey, DateTime, Float, String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class VitalReading(Base):
    __tablename__ = "vital_readings"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), nullable=False, index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    
    # Vital signs
    heart_rate: Mapped[float] = mapped_column(Float, nullable=True)  # bpm
    spo2: Mapped[float] = mapped_column(Float, nullable=True)  # percentage
    temperature: Mapped[float] = mapped_column(Float, nullable=True)  # celsius
    blood_pressure_systolic: Mapped[int] = mapped_column(Integer, nullable=True)
    blood_pressure_diastolic: Mapped[int] = mapped_column(Integer, nullable=True)
    respiratory_rate: Mapped[float] = mapped_column(Float, nullable=True)
    
    # Metadata
    source: Mapped[str] = mapped_column(String(50), default="simulator")  # simulator, manual, sensor
    device_id: Mapped[str] = mapped_column(String(100), nullable=True)
    is_anomaly: Mapped[bool] = mapped_column(Boolean, default=False)
    anomaly_score: Mapped[float] = mapped_column(Float, nullable=True)
    
    # Relationships
    patient: Mapped["Patient"] = relationship("Patient", back_populates="vital_readings")
    
    def __repr__(self):
        return f"<VitalReading {self.id} - HR:{self.heart_rate} SpO2:{self.spo2} Temp:{self.temperature}>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "timestamp": self.timestamp.isoformat(),
            "heart_rate": self.heart_rate,
            "spo2": self.spo2,
            "temperature": self.temperature,
            "blood_pressure_systolic": self.blood_pressure_systolic,
            "blood_pressure_diastolic": self.blood_pressure_diastolic,
            "respiratory_rate": self.respiratory_rate,
            "source": self.source,
            "is_anomaly": self.is_anomaly,
            "anomaly_score": self.anomaly_score,
        }


# Import to avoid circular import
from app.models.patient import Patient
