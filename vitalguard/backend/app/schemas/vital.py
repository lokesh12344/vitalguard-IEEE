from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class VitalCreate(BaseModel):
    patient_id: int
    heart_rate: Optional[float] = None
    spo2: Optional[float] = None
    temperature: Optional[float] = None
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    respiratory_rate: Optional[float] = None
    source: str = "simulator"
    device_id: Optional[str] = None


class VitalResponse(BaseModel):
    id: int
    patient_id: int
    timestamp: datetime
    heart_rate: Optional[float] = None
    spo2: Optional[float] = None
    temperature: Optional[float] = None
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    respiratory_rate: Optional[float] = None
    source: str
    is_anomaly: bool = False
    anomaly_score: Optional[float] = None
    
    class Config:
        from_attributes = True


class VitalDataPoint(BaseModel):
    timestamp: datetime
    value: float


class VitalTrendResponse(BaseModel):
    patient_id: int
    vital_type: str
    period: str  # 24h, 7d, 30d
    data_points: List[VitalDataPoint]
    min_value: float
    max_value: float
    avg_value: float


class LatestVitalsResponse(BaseModel):
    patient_id: int
    timestamp: datetime
    heart_rate: Optional[float] = None
    heart_rate_status: str = "normal"  # normal, warning, critical
    spo2: Optional[float] = None
    spo2_status: str = "normal"
    temperature: Optional[float] = None
    temperature_status: str = "normal"
    blood_pressure: Optional[str] = None
    blood_pressure_status: str = "normal"
    overall_status: str = "normal"
    
    class Config:
        from_attributes = True
