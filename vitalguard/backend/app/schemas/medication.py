from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel
from app.models.medication import MedicationStatus


class MedicationCreate(BaseModel):
    patient_id: int
    name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    schedule_times: Optional[str] = None  # JSON array string
    start_date: date
    end_date: Optional[date] = None
    instructions: Optional[str] = None


class MedicationUpdate(BaseModel):
    name: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    schedule_times: Optional[str] = None
    end_date: Optional[date] = None
    instructions: Optional[str] = None
    is_active: Optional[bool] = None


class MedicationResponse(BaseModel):
    id: int
    patient_id: int
    name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    schedule_times: Optional[str] = None
    start_date: date
    end_date: Optional[date] = None
    instructions: Optional[str] = None
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class MedicationLogCreate(BaseModel):
    medication_id: int
    scheduled_time: datetime
    status: MedicationStatus = MedicationStatus.TAKEN
    taken_time: Optional[datetime] = None
    notes: Optional[str] = None
    logged_via: str = "app"


class MedicationLogResponse(BaseModel):
    id: int
    medication_id: int
    patient_id: int
    medication_name: str
    scheduled_time: datetime
    taken_time: Optional[datetime] = None
    status: MedicationStatus
    notes: Optional[str] = None
    logged_via: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class MedicationAdherenceResponse(BaseModel):
    medication_id: int
    medication_name: str
    total_scheduled: int
    taken_count: int
    missed_count: int
    skipped_count: int
    adherence_rate: float  # percentage


class TodayMedicationResponse(BaseModel):
    id: int
    medication_id: int
    medication_name: str
    dosage: Optional[str] = None
    scheduled_time: datetime
    status: MedicationStatus
    taken_time: Optional[datetime] = None
    instructions: Optional[str] = None
    
    class Config:
        from_attributes = True
