"""
Public API Router for VitalGuard Demo

Provides public endpoints for the frontend to fetch data without authentication.
In production, these would require proper authentication.
"""

from typing import List, Optional
from datetime import datetime, timedelta, date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field
from passlib.context import CryptContext

from app.database import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient, RiskLevel, AlertThreshold
from app.models.vital import VitalReading
from app.models.medication import Medication, MedicationLog, MedicationStatus
from app.models.alert import Alert, AlertSeverity

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

router = APIRouter(prefix="/public", tags=["Public API"])


# Response Models
class VitalSignResponse(BaseModel):
    id: int
    patient_id: int
    timestamp: datetime
    heart_rate: Optional[float]
    spo2: Optional[float]
    temperature: Optional[float]
    blood_pressure_systolic: Optional[int]
    blood_pressure_diastolic: Optional[int]
    respiratory_rate: Optional[float]
    source: str
    
    class Config:
        from_attributes = True


class CurrentVitalsResponse(BaseModel):
    heart_rate: dict
    temperature: dict
    spo2: dict
    blood_pressure: dict
    last_updated: datetime


class PatientSummary(BaseModel):
    id: int
    name: str
    age: int
    condition: str
    risk_level: str
    avatar: str
    last_updated: Optional[datetime]
    doctor_name: Optional[str]
    caretaker_name: Optional[str]
    emergency_contact: Optional[str]
    
    class Config:
        from_attributes = True


class MedicationResponse(BaseModel):
    id: int
    name: str
    dosage: Optional[str]
    frequency: Optional[str]
    adherence: int  # Percentage
    next_dose: Optional[str]
    
    class Config:
        from_attributes = True


class AlertResponse(BaseModel):
    id: int
    type: str
    message: str
    severity: str
    timestamp: datetime
    active: bool
    
    class Config:
        from_attributes = True


class PatientDashboardResponse(BaseModel):
    patient: PatientSummary
    vitals: CurrentVitalsResponse
    medications: List[MedicationResponse]
    alerts: List[AlertResponse]


def get_vital_status(value: float, vital_type: str) -> str:
    """Determine status based on vital value."""
    if vital_type == "heart_rate":
        if value < 50 or value > 120:
            return "critical"
        elif value < 60 or value > 100:
            return "warning"
        return "normal"
    elif vital_type == "spo2":
        if value < 88:
            return "critical"
        elif value < 92:
            return "warning"
        return "normal"
    elif vital_type == "temperature":
        if value < 35 or value > 38.5:
            return "critical"
        elif value < 36 or value > 37.5:
            return "warning"
        return "normal"
    return "normal"


def get_avatar(name: str) -> str:
    """Generate avatar initials from name."""
    parts = name.split()
    if len(parts) >= 2:
        return parts[0][0] + parts[-1][0]
    return name[:2].upper()


@router.get("/patients", response_model=List[PatientSummary])
async def get_all_patients(
    db: AsyncSession = Depends(get_db),
    risk_level: Optional[str] = None
):
    """Get all patients with summary info."""
    query = select(Patient)
    
    if risk_level:
        query = query.where(Patient.risk_level == RiskLevel(risk_level))
    
    result = await db.execute(query)
    patients = result.scalars().all()
    
    summaries = []
    for patient in patients:
        # Get user info
        user_result = await db.execute(select(User).where(User.id == patient.user_id))
        user = user_result.scalar_one_or_none()
        
        # Get latest vital timestamp
        vital_result = await db.execute(
            select(VitalReading.timestamp)
            .where(VitalReading.patient_id == patient.id)
            .order_by(VitalReading.timestamp.desc())
            .limit(1)
        )
        last_vital = vital_result.scalar_one_or_none()
        
        # Get doctor name
        doctor_name = None
        if patient.primary_doctor_id:
            doc_result = await db.execute(select(User).where(User.id == patient.primary_doctor_id))
            doc = doc_result.scalar_one_or_none()
            doctor_name = doc.full_name if doc else None
        
        # Get caretaker name
        caretaker_name = None
        if patient.caregiver_id:
            care_result = await db.execute(select(User).where(User.id == patient.caregiver_id))
            care = care_result.scalar_one_or_none()
            caretaker_name = care.full_name if care else None
        
        summaries.append(PatientSummary(
            id=patient.id,
            name=user.full_name if user else f"Patient {patient.id}",
            age=patient.age,
            condition=patient.condition_summary or "No conditions listed",
            risk_level=patient.risk_level.value,
            avatar=get_avatar(user.full_name if user else "PA"),
            last_updated=last_vital,
            doctor_name=doctor_name,
            caretaker_name=caretaker_name,
            emergency_contact=patient.emergency_contact_phone,
        ))
    
    # Sort by risk level (critical first)
    risk_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    summaries.sort(key=lambda x: risk_order.get(x.risk_level, 4))
    
    return summaries


@router.get("/patients/{patient_id}", response_model=PatientSummary)
async def get_patient(patient_id: int, db: AsyncSession = Depends(get_db)):
    """Get single patient info."""
    result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = result.scalar_one_or_none()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    user_result = await db.execute(select(User).where(User.id == patient.user_id))
    user = user_result.scalar_one_or_none()
    
    vital_result = await db.execute(
        select(VitalReading.timestamp)
        .where(VitalReading.patient_id == patient.id)
        .order_by(VitalReading.timestamp.desc())
        .limit(1)
    )
    last_vital = vital_result.scalar_one_or_none()
    
    doctor_name = None
    if patient.primary_doctor_id:
        doc_result = await db.execute(select(User).where(User.id == patient.primary_doctor_id))
        doc = doc_result.scalar_one_or_none()
        doctor_name = doc.full_name if doc else None
    
    caretaker_name = None
    if patient.caregiver_id:
        care_result = await db.execute(select(User).where(User.id == patient.caregiver_id))
        care = care_result.scalar_one_or_none()
        caretaker_name = care.full_name if care else None
    
    return PatientSummary(
        id=patient.id,
        name=user.full_name if user else f"Patient {patient.id}",
        age=patient.age,
        condition=patient.condition_summary or "No conditions listed",
        risk_level=patient.risk_level.value,
        avatar=get_avatar(user.full_name if user else "PA"),
        last_updated=last_vital,
        doctor_name=doctor_name,
        caretaker_name=caretaker_name,
        emergency_contact=patient.emergency_contact_phone,
    )


@router.get("/patients/{patient_id}/vitals/current", response_model=CurrentVitalsResponse)
async def get_current_vitals(patient_id: int, db: AsyncSession = Depends(get_db)):
    """Get current/latest vitals for a patient."""
    result = await db.execute(
        select(VitalReading)
        .where(VitalReading.patient_id == patient_id)
        .order_by(VitalReading.timestamp.desc())
        .limit(1)
    )
    vital = result.scalar_one_or_none()
    
    if not vital:
        raise HTTPException(status_code=404, detail="No vital readings found")
    
    return CurrentVitalsResponse(
        heart_rate={
            "value": vital.heart_rate,
            "unit": "bpm",
            "status": get_vital_status(vital.heart_rate, "heart_rate") if vital.heart_rate else "unknown",
        },
        temperature={
            "value": vital.temperature,
            "unit": "°C",
            "status": get_vital_status(vital.temperature, "temperature") if vital.temperature else "unknown",
        },
        spo2={
            "value": vital.spo2,
            "unit": "%",
            "status": get_vital_status(vital.spo2, "spo2") if vital.spo2 else "unknown",
        },
        blood_pressure={
            "systolic": vital.blood_pressure_systolic,
            "diastolic": vital.blood_pressure_diastolic,
            "unit": "mmHg",
            "status": "normal",
        },
        last_updated=vital.timestamp,
    )


@router.get("/patients/{patient_id}/vitals/history", response_model=List[VitalSignResponse])
async def get_vitals_history(
    patient_id: int,
    db: AsyncSession = Depends(get_db),
    hours: int = Query(24, ge=1, le=168),
    sample_interval: int = Query(120, ge=30, le=360)  # Minutes between samples, default 2 hours
):
    """Get vital history for specified hours with sampling.
    
    Args:
        patient_id: Patient ID
        hours: Number of hours of history to fetch
        sample_interval: Minutes between data points (default: 120 = 2 hours)
    """
    since = datetime.utcnow() - timedelta(hours=hours)
    
    result = await db.execute(
        select(VitalReading)
        .where(
            and_(
                VitalReading.patient_id == patient_id,
                VitalReading.timestamp >= since
            )
        )
        .order_by(VitalReading.timestamp.asc())
    )
    vitals = result.scalars().all()
    
    # Sample vitals at specified interval for more realistic display
    if not vitals:
        return []
    
    sampled_vitals = []
    interval_delta = timedelta(minutes=sample_interval)
    
    if vitals:
        last_sampled_time = None
        for v in vitals:
            if last_sampled_time is None or (v.timestamp - last_sampled_time) >= interval_delta:
                sampled_vitals.append(VitalSignResponse.model_validate(v))
                last_sampled_time = v.timestamp
        
        # Always include the most recent reading
        if vitals and (not sampled_vitals or sampled_vitals[-1].id != vitals[-1].id):
            sampled_vitals.append(VitalSignResponse.model_validate(vitals[-1]))
    
    return sampled_vitals


@router.get("/patients/{patient_id}/medications", response_model=List[MedicationResponse])
async def get_patient_medications(patient_id: int, db: AsyncSession = Depends(get_db)):
    """Get medications and adherence for a patient."""
    result = await db.execute(
        select(Medication)
        .where(
            and_(
                Medication.patient_id == patient_id,
                Medication.is_active == True
            )
        )
    )
    medications = result.scalars().all()
    
    response = []
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    
    for med in medications:
        # Calculate adherence from logs in past week
        logs_result = await db.execute(
            select(MedicationLog)
            .where(
                and_(
                    MedicationLog.medication_id == med.id,
                    MedicationLog.scheduled_time >= week_ago
                )
            )
        )
        logs = logs_result.scalars().all()
        
        if logs:
            taken = sum(1 for log in logs if log.status == MedicationStatus.TAKEN)
            adherence = int((taken / len(logs)) * 100)
        else:
            adherence = 100  # No logs yet, assume 100%
        
        # Find next scheduled dose
        next_log_result = await db.execute(
            select(MedicationLog)
            .where(
                and_(
                    MedicationLog.medication_id == med.id,
                    MedicationLog.status == MedicationStatus.PENDING,
                    MedicationLog.scheduled_time > now
                )
            )
            .order_by(MedicationLog.scheduled_time.asc())
            .limit(1)
        )
        next_log = next_log_result.scalar_one_or_none()
        next_dose = next_log.scheduled_time.strftime("%H:%M") if next_log else None
        
        response.append(MedicationResponse(
            id=med.id,
            name=med.name,
            dosage=med.dosage,
            frequency=med.frequency,
            adherence=adherence,
            next_dose=next_dose,
        ))
    
    return response


@router.get("/patients/{patient_id}/alerts", response_model=List[AlertResponse])
async def get_patient_alerts(
    patient_id: int,
    db: AsyncSession = Depends(get_db),
    hours: int = Query(24, ge=1, le=168)
):
    """Get alerts for a patient."""
    since = datetime.utcnow() - timedelta(hours=hours)
    
    result = await db.execute(
        select(Alert)
        .where(
            and_(
                Alert.patient_id == patient_id,
                Alert.created_at >= since
            )
        )
        .order_by(Alert.created_at.desc())
    )
    alerts = result.scalars().all()
    
    return [
        AlertResponse(
            id=alert.id,
            type=alert.alert_type.value,
            message=alert.message,
            severity=alert.severity.value,
            timestamp=alert.created_at,
            active=not alert.is_acknowledged,
        )
        for alert in alerts
    ]


@router.get("/patients/{patient_id}/dashboard", response_model=PatientDashboardResponse)
async def get_patient_dashboard(patient_id: int, db: AsyncSession = Depends(get_db)):
    """Get complete dashboard data for a patient."""
    patient = await get_patient(patient_id, db)
    vitals = await get_current_vitals(patient_id, db)
    medications = await get_patient_medications(patient_id, db)
    alerts = await get_patient_alerts(patient_id, db)
    
    return PatientDashboardResponse(
        patient=patient,
        vitals=vitals,
        medications=medications,
        alerts=alerts,
    )


@router.get("/alerts", response_model=List[AlertResponse])
async def get_all_alerts(
    db: AsyncSession = Depends(get_db),
    hours: int = Query(24, ge=1, le=168),
    severity: Optional[str] = None,
    acknowledged: Optional[bool] = None
):
    """Get all alerts across patients."""
    since = datetime.utcnow() - timedelta(hours=hours)
    
    query = select(Alert).where(Alert.created_at >= since)
    
    if severity:
        query = query.where(Alert.severity == AlertSeverity(severity))
    
    if acknowledged is not None:
        query = query.where(Alert.is_acknowledged == acknowledged)
    
    result = await db.execute(query.order_by(Alert.created_at.desc()))
    alerts = result.scalars().all()
    
    return [
        AlertResponse(
            id=alert.id,
            type=alert.alert_type.value,
            message=alert.message,
            severity=alert.severity.value,
            timestamp=alert.created_at,
            active=not alert.is_acknowledged,
        )
        for alert in alerts
    ]


@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: int, db: AsyncSession = Depends(get_db)):
    """Acknowledge an alert."""
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.is_acknowledged = True
    alert.acknowledged_at = datetime.utcnow()
    await db.commit()
    
    return {"status": "acknowledged", "alert_id": alert_id}


@router.get("/doctors", response_model=List[dict])
async def get_doctors(db: AsyncSession = Depends(get_db)):
    """Get all doctors."""
    result = await db.execute(select(User).where(User.role == UserRole.DOCTOR))
    doctors = result.scalars().all()
    
    return [
        {
            "id": doc.id,
            "name": doc.full_name,
            "email": doc.email,
            "phone": doc.phone,
        }
        for doc in doctors
    ]


@router.get("/caretakers", response_model=List[dict])
async def get_caretakers(db: AsyncSession = Depends(get_db)):
    """Get all caretakers."""
    result = await db.execute(select(User).where(User.role == UserRole.CAREGIVER))
    caretakers = result.scalars().all()
    
    return [
        {
            "id": care.id,
            "name": care.full_name,
            "email": care.email,
            "phone": care.phone,
        }
        for care in caretakers
    ]


@router.get("/doctors/{doctor_id}/patients", response_model=List[PatientSummary])
async def get_doctor_patients(doctor_id: int, db: AsyncSession = Depends(get_db)):
    """Get all patients assigned to a doctor."""
    result = await db.execute(
        select(Patient).where(Patient.primary_doctor_id == doctor_id)
    )
    patients = result.scalars().all()
    
    summaries = []
    for patient in patients:
        user_result = await db.execute(select(User).where(User.id == patient.user_id))
        user = user_result.scalar_one_or_none()
        
        vital_result = await db.execute(
            select(VitalReading.timestamp)
            .where(VitalReading.patient_id == patient.id)
            .order_by(VitalReading.timestamp.desc())
            .limit(1)
        )
        last_vital = vital_result.scalar_one_or_none()
        
        summaries.append(PatientSummary(
            id=patient.id,
            name=user.full_name if user else f"Patient {patient.id}",
            age=patient.age,
            condition=patient.condition_summary or "No conditions listed",
            risk_level=patient.risk_level.value,
            avatar=get_avatar(user.full_name if user else "PA"),
            last_updated=last_vital,
            doctor_name=None,
            caretaker_name=None,
            emergency_contact=patient.emergency_contact_phone,
        ))
    
    risk_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    summaries.sort(key=lambda x: risk_order.get(x.risk_level, 4))
    
    return summaries


@router.get("/caretakers/{caretaker_id}/patients", response_model=List[PatientSummary])
async def get_caretaker_patients(caretaker_id: int, db: AsyncSession = Depends(get_db)):
    """Get all patients linked to a caretaker."""
    result = await db.execute(
        select(Patient).where(Patient.caregiver_id == caretaker_id)
    )
    patients = result.scalars().all()
    
    summaries = []
    for patient in patients:
        user_result = await db.execute(select(User).where(User.id == patient.user_id))
        user = user_result.scalar_one_or_none()
        
        vital_result = await db.execute(
            select(VitalReading.timestamp)
            .where(VitalReading.patient_id == patient.id)
            .order_by(VitalReading.timestamp.desc())
            .limit(1)
        )
        last_vital = vital_result.scalar_one_or_none()
        
        doctor_name = None
        if patient.primary_doctor_id:
            doc_result = await db.execute(select(User).where(User.id == patient.primary_doctor_id))
            doc = doc_result.scalar_one_or_none()
            doctor_name = doc.full_name if doc else None
        
        summaries.append(PatientSummary(
            id=patient.id,
            name=user.full_name if user else f"Patient {patient.id}",
            age=patient.age,
            condition=patient.condition_summary or "No conditions listed",
            risk_level=patient.risk_level.value,
            avatar=get_avatar(user.full_name if user else "PA"),
            last_updated=last_vital,
            doctor_name=doctor_name,
            caretaker_name=None,
            emergency_contact=patient.emergency_contact_phone,
        ))
    
    return summaries


@router.post("/patients/{patient_id}/medications/{medication_id}/take")
async def mark_medication_taken(
    patient_id: int,
    medication_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Mark a pending medication as taken."""
    now = datetime.utcnow()
    
    # Find the next pending log for this medication
    result = await db.execute(
        select(MedicationLog)
        .where(
            and_(
                MedicationLog.medication_id == medication_id,
                MedicationLog.patient_id == patient_id,
                MedicationLog.status == MedicationStatus.PENDING
            )
        )
        .order_by(MedicationLog.scheduled_time.asc())
        .limit(1)
    )
    log = result.scalar_one_or_none()
    
    if not log:
        raise HTTPException(status_code=404, detail="No pending medication found")
    
    log.status = MedicationStatus.TAKEN
    log.taken_time = now
    await db.commit()
    
    return {"status": "taken", "medication_id": medication_id, "taken_at": now.isoformat()}


# SOS Request/Response Models
class SOSRequest(BaseModel):
    location: Optional[str] = None
    message: Optional[str] = None


class SOSResponse(BaseModel):
    success: bool
    patient_name: str
    timestamp: str
    notifications_sent: List[dict]
    notifications_failed: List[dict]


@router.post("/patients/{patient_id}/sos", response_model=SOSResponse)
async def trigger_sos_alert(
    patient_id: int,
    sos_data: SOSRequest = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Trigger emergency SOS alert for a patient.
    
    Sends SMS notifications to:
    - Emergency contact
    - Assigned doctor
    - Configured alert numbers
    
    Also creates an emergency alert record in the database.
    """
    from app.services.twilio import twilio_service
    
    # Get patient with user info
    result = await db.execute(
        select(Patient)
        .options(selectinload(Patient.user))
        .where(Patient.id == patient_id)
    )
    patient = result.scalar_one_or_none()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Get doctor info if assigned
    doctor_name = None
    doctor_phone = None
    if patient.primary_doctor_id:
        result = await db.execute(
            select(User).where(User.id == patient.primary_doctor_id)
        )
        doctor = result.scalar_one_or_none()
        if doctor:
            doctor_name = doctor.full_name
            doctor_phone = doctor.phone
    
    # Send SOS via Twilio
    sos_result = await twilio_service.send_sos_alert(
        patient_name=patient.user.full_name,
        patient_phone=patient.user.phone or "Not provided",
        emergency_contact_name=patient.emergency_contact_name or "Emergency Contact",
        emergency_contact_phone=patient.emergency_contact_phone,
        doctor_name=doctor_name,
        doctor_phone=doctor_phone,
        location=sos_data.location if sos_data else None,
        message=sos_data.message if sos_data else None
    )
    
    # Create emergency alert in database
    from app.models.alert import AlertType
    emergency_alert = Alert(
        patient_id=patient_id,
        alert_type=AlertType.VITAL_CRITICAL,
        severity=AlertSeverity.EMERGENCY,
        vital_type="SOS",
        vital_value=0,
        message=f"🚨 Emergency SOS triggered by {patient.user.full_name}. "
                f"{sos_data.message if sos_data and sos_data.message else 'Immediate assistance required.'}",
        is_acknowledged=False,
        notification_sent=True,
        notification_channels="SMS"
    )
    db.add(emergency_alert)
    await db.commit()
    
    timestamp = datetime.utcnow().isoformat()
    
    # SOS is considered successful if alert was recorded, even if SMS failed
    # This ensures patient knows help request was logged
    return SOSResponse(
        success=True,  # Alert was recorded in database
        patient_name=patient.user.full_name,
        timestamp=timestamp,
        notifications_sent=sos_result["notifications_sent"],
        notifications_failed=sos_result["notifications_failed"]
    )


# =============================================================================
# ADMIN / RECEPTIONIST PATIENT REGISTRATION
# =============================================================================

class InitialVitals(BaseModel):
    """Initial vitals data for patient registration"""
    heart_rate: float = Field(..., ge=30, le=220, description="Heart rate in bpm")
    spo2: float = Field(..., ge=50, le=100, description="Oxygen saturation percentage")
    temperature: float = Field(..., ge=35, le=42, description="Body temperature in Celsius")
    blood_sugar: Optional[float] = Field(None, ge=20, le=600, description="Blood sugar in mg/dL")
    blood_pressure_systolic: int = Field(..., ge=70, le=250, description="Systolic BP in mmHg")
    blood_pressure_diastolic: int = Field(..., ge=40, le=150, description="Diastolic BP in mmHg")


class PatientRegistrationRequest(BaseModel):
    """Request model for patient registration"""
    # Patient details
    full_name: str = Field(..., min_length=2, max_length=255)
    age: int = Field(..., ge=0, le=150)
    gender: str = Field(..., pattern="^(male|female|other)$")
    contact_number: str = Field(..., min_length=10, max_length=20)
    medical_condition: Optional[str] = Field(None, max_length=500)
    
    # Initial vitals
    vitals: InitialVitals
    
    # Doctor assignment (default to Dr. Priya Sharma - doctor_id=1)
    doctor_id: int = Field(default=1, description="ID of assigned doctor")
    
    # Emergency contact (optional)
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None


class PatientRegistrationResponse(BaseModel):
    """Response model for patient registration"""
    success: bool
    message: str
    patient_id: int
    user_id: int
    risk_level: str
    risk_color: str
    patient_name: str
    assigned_doctor: str


def calculate_risk_level(vitals: InitialVitals) -> tuple[RiskLevel, str]:
    """
    Calculate risk level based on vitals.
    Returns tuple of (RiskLevel enum, color string)
    
    Risk Rules:
    - Heart Rate > 120 or < 50 → HIGH (Red)
    - Heart Rate 100-120 or 50-60 → MEDIUM (Yellow)
    - SpO2 < 90 → HIGH (Red)
    - SpO2 90-94 → MEDIUM (Yellow)
    - Temperature > 39 → HIGH (Red)
    - Temperature 37.5-39 → MEDIUM (Yellow)
    - BP Systolic > 180 or < 90 → HIGH (Red)
    - BP Systolic 140-180 or 90-100 → MEDIUM (Yellow)
    - Blood Sugar > 200 or < 70 → HIGH (Red)
    - Blood Sugar 140-200 → MEDIUM (Yellow)
    """
    risk_score = 0
    
    # Heart Rate assessment
    if vitals.heart_rate > 120 or vitals.heart_rate < 50:
        risk_score += 3
    elif vitals.heart_rate > 100 or vitals.heart_rate < 60:
        risk_score += 1
    
    # SpO2 assessment
    if vitals.spo2 < 90:
        risk_score += 3
    elif vitals.spo2 < 94:
        risk_score += 1
    
    # Temperature assessment
    if vitals.temperature > 39:
        risk_score += 3
    elif vitals.temperature > 37.5:
        risk_score += 1
    
    # Blood Pressure assessment
    if vitals.blood_pressure_systolic > 180 or vitals.blood_pressure_systolic < 90:
        risk_score += 3
    elif vitals.blood_pressure_systolic > 140 or vitals.blood_pressure_systolic < 100:
        risk_score += 1
    
    # Blood Sugar assessment (if provided)
    if vitals.blood_sugar:
        if vitals.blood_sugar > 200 or vitals.blood_sugar < 70:
            risk_score += 3
        elif vitals.blood_sugar > 140:
            risk_score += 1
    
    # Determine final risk level
    if risk_score >= 6:
        return RiskLevel.HIGH, "red"
    elif risk_score >= 2:
        return RiskLevel.MEDIUM, "yellow"
    else:
        return RiskLevel.LOW, "green"


@router.post("/admin/register-patient", response_model=PatientRegistrationResponse)
async def register_patient(
    registration: PatientRegistrationRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Admin/Receptionist endpoint to register a new patient.
    
    Creates:
    1. User account for the patient
    2. Patient profile with assigned doctor
    3. Initial vital readings
    4. Default alert thresholds
    
    Returns risk level based on initial vitals.
    """
    try:
        # Calculate risk level from vitals
        risk_level, risk_color = calculate_risk_level(registration.vitals)
        
        # Generate email from name (for demo purposes)
        email_base = registration.full_name.lower().replace(" ", ".").replace("'", "")
        email = f"{email_base}@patient.vitalguard.com"
        
        # Check if email already exists
        existing_user = await db.execute(
            select(User).where(User.email == email)
        )
        if existing_user.scalar_one_or_none():
            # Add timestamp to make unique
            import time
            email = f"{email_base}.{int(time.time())}@patient.vitalguard.com"
        
        # Create user account
        hashed_password = pwd_context.hash("patient123")  # Default password
        new_user = User(
            email=email,
            hashed_password=hashed_password,
            full_name=registration.full_name,
            role=UserRole.PATIENT,
            phone=registration.contact_number,
            is_active=True
        )
        db.add(new_user)
        await db.flush()  # Get user ID
        
        # Calculate date of birth from age
        today = date.today()
        birth_year = today.year - registration.age
        date_of_birth = date(birth_year, 1, 1)  # Approximate DOB
        
        # Create patient profile
        new_patient = Patient(
            user_id=new_user.id,
            date_of_birth=date_of_birth,
            gender=registration.gender,
            blood_type="O+",  # Default blood type (5 chars max)
            emergency_contact_name=registration.emergency_contact_name or "Emergency Contact",
            emergency_contact_phone=registration.emergency_contact_phone or registration.contact_number,
            primary_doctor_id=registration.doctor_id,
            condition_summary=registration.medical_condition or "Under observation",
            risk_level=risk_level
        )
        db.add(new_patient)
        await db.flush()  # Get patient ID
        
        # Create initial vital reading
        initial_vitals = VitalReading(
            patient_id=new_patient.id,
            timestamp=datetime.utcnow(),
            heart_rate=registration.vitals.heart_rate,
            spo2=registration.vitals.spo2,
            temperature=registration.vitals.temperature,
            blood_pressure_systolic=registration.vitals.blood_pressure_systolic,
            blood_pressure_diastolic=registration.vitals.blood_pressure_diastolic,
            respiratory_rate=16.0,  # Default normal value
            source="registration",
            is_anomaly=risk_level == RiskLevel.HIGH
        )
        db.add(initial_vitals)
        
        # Create default alert thresholds
        default_thresholds = [
            AlertThreshold(
                patient_id=new_patient.id,
                vital_type="heart_rate",
                min_warning=60, max_warning=100,
                min_critical=50, max_critical=120
            ),
            AlertThreshold(
                patient_id=new_patient.id,
                vital_type="spo2",
                min_warning=94, max_warning=100,
                min_critical=90, max_critical=100
            ),
            AlertThreshold(
                patient_id=new_patient.id,
                vital_type="temperature",
                min_warning=36.0, max_warning=37.5,
                min_critical=35.0, max_critical=39.0
            )
        ]
        for threshold in default_thresholds:
            db.add(threshold)
        
        # Get assigned doctor name
        doctor = await db.execute(
            select(User).where(User.id == registration.doctor_id)
        )
        doctor_user = doctor.scalar_one_or_none()
        doctor_name = doctor_user.full_name if doctor_user else "Dr. Priya Sharma"
        
        # Commit all changes
        await db.commit()
        
        return PatientRegistrationResponse(
            success=True,
            message=f"Patient {registration.full_name} registered successfully",
            patient_id=new_patient.id,
            user_id=new_user.id,
            risk_level=risk_level.value.upper(),
            risk_color=risk_color,
            patient_name=registration.full_name,
            assigned_doctor=doctor_name
        )
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to register patient: {str(e)}"
        )


@router.get("/admin/doctors")
async def get_available_doctors(db: AsyncSession = Depends(get_db)):
    """Get list of available doctors for assignment"""
    result = await db.execute(
        select(User).where(User.role == UserRole.DOCTOR, User.is_active == True)
    )
    doctors = result.scalars().all()
    
    return [
        {
            "id": doc.id,
            "name": doc.full_name,
            "email": doc.email,
            "phone": doc.phone
        }
        for doc in doctors
    ]


@router.get("/admin/recent-registrations")
async def get_recent_registrations(
    limit: int = Query(default=10, le=50),
    db: AsyncSession = Depends(get_db)
):
    """Get recently registered patients"""
    result = await db.execute(
        select(Patient)
        .options(selectinload(Patient.user), selectinload(Patient.primary_doctor))
        .order_by(desc(Patient.created_at))
        .limit(limit)
    )
    patients = result.scalars().all()
    
    return [
        {
            "id": p.id,
            "name": p.user.full_name,
            "age": p.age,
            "gender": p.gender,
            "risk_level": p.risk_level.value if p.risk_level else "unknown",
            "condition": p.condition_summary,
            "doctor_name": p.primary_doctor.full_name if p.primary_doctor else "Not assigned",
            "registered_at": p.created_at.isoformat()
        }
        for p in patients
    ]

