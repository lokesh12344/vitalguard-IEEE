from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel
from app.models.patient import RiskLevel


class AlertThresholdCreate(BaseModel):
    vital_type: str
    min_warning: Optional[float] = None
    max_warning: Optional[float] = None
    min_critical: Optional[float] = None
    max_critical: Optional[float] = None


class AlertThresholdUpdate(BaseModel):
    min_warning: Optional[float] = None
    max_warning: Optional[float] = None
    min_critical: Optional[float] = None
    max_critical: Optional[float] = None


class AlertThresholdResponse(BaseModel):
    id: int
    patient_id: int
    vital_type: str
    min_warning: Optional[float] = None
    max_warning: Optional[float] = None
    min_critical: Optional[float] = None
    max_critical: Optional[float] = None
    
    class Config:
        from_attributes = True


class PatientCreate(BaseModel):
    user_id: int
    date_of_birth: date
    gender: Optional[str] = None
    blood_type: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    primary_doctor_id: Optional[int] = None
    caregiver_id: Optional[int] = None
    discharge_date: Optional[date] = None
    condition_summary: Optional[str] = None
    risk_level: RiskLevel = RiskLevel.MEDIUM


class PatientUpdate(BaseModel):
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    primary_doctor_id: Optional[int] = None
    caregiver_id: Optional[int] = None
    condition_summary: Optional[str] = None
    risk_level: Optional[RiskLevel] = None


class LatestVitals(BaseModel):
    heart_rate: Optional[float] = None
    spo2: Optional[float] = None
    temperature: Optional[float] = None
    blood_pressure: Optional[str] = None
    timestamp: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class PatientResponse(BaseModel):
    id: int
    user_id: int
    full_name: str
    email: str
    phone: Optional[str] = None
    date_of_birth: date
    age: int
    gender: Optional[str] = None
    blood_type: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    primary_doctor_id: Optional[int] = None
    caregiver_id: Optional[int] = None
    discharge_date: Optional[date] = None
    condition_summary: Optional[str] = None
    risk_level: RiskLevel
    created_at: datetime
    latest_vitals: Optional[LatestVitals] = None
    unacknowledged_alerts: int = 0
    
    class Config:
        from_attributes = True


class PatientListResponse(BaseModel):
    patients: List[PatientResponse]
    total: int
