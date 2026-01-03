from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient, AlertThreshold
from app.models.vital import VitalReading
from app.models.alert import Alert
from app.schemas.patient import (
    PatientCreate, PatientUpdate, PatientResponse, PatientListResponse,
    AlertThresholdCreate, AlertThresholdUpdate, AlertThresholdResponse,
    LatestVitals
)
from app.dependencies import get_current_user, require_role, get_patient_if_authorized
from app.services.alert import create_default_thresholds

router = APIRouter(prefix="/patients", tags=["Patients"])


async def build_patient_response(
    db: AsyncSession,
    patient: Patient,
    user: User
) -> PatientResponse:
    """Build a patient response with latest vitals and alert count."""
    # Get latest vital reading
    latest_vital_result = await db.execute(
        select(VitalReading)
        .where(VitalReading.patient_id == patient.id)
        .order_by(VitalReading.timestamp.desc())
        .limit(1)
    )
    latest_vital = latest_vital_result.scalar_one_or_none()
    
    latest_vitals = None
    if latest_vital:
        bp = None
        if latest_vital.blood_pressure_systolic and latest_vital.blood_pressure_diastolic:
            bp = f"{latest_vital.blood_pressure_systolic}/{latest_vital.blood_pressure_diastolic}"
        latest_vitals = LatestVitals(
            heart_rate=latest_vital.heart_rate,
            spo2=latest_vital.spo2,
            temperature=latest_vital.temperature,
            blood_pressure=bp,
            timestamp=latest_vital.timestamp
        )
    
    # Count unacknowledged alerts
    alert_count_result = await db.execute(
        select(func.count(Alert.id))
        .where(
            and_(
                Alert.patient_id == patient.id,
                Alert.is_acknowledged == False
            )
        )
    )
    unacknowledged_alerts = alert_count_result.scalar() or 0
    
    return PatientResponse(
        id=patient.id,
        user_id=patient.user_id,
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        date_of_birth=patient.date_of_birth,
        age=patient.age,
        gender=patient.gender,
        blood_type=patient.blood_type,
        emergency_contact_name=patient.emergency_contact_name,
        emergency_contact_phone=patient.emergency_contact_phone,
        primary_doctor_id=patient.primary_doctor_id,
        caregiver_id=patient.caregiver_id,
        discharge_date=patient.discharge_date,
        condition_summary=patient.condition_summary,
        risk_level=patient.risk_level,
        created_at=patient.created_at,
        latest_vitals=latest_vitals,
        unacknowledged_alerts=unacknowledged_alerts
    )


@router.get("", response_model=PatientListResponse)
async def get_patients(
    current_user: User = Depends(require_role(UserRole.DOCTOR, UserRole.CAREGIVER)),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100)
):
    """
    Get list of patients.
    - Doctors see all patients assigned to them
    - Caregivers see their assigned patients
    """
    if current_user.role == UserRole.DOCTOR:
        query = select(Patient).where(Patient.primary_doctor_id == current_user.id)
    else:  # CAREGIVER
        query = select(Patient).where(Patient.caregiver_id == current_user.id)
    
    # Get total count
    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar() or 0
    
    # Get paginated results
    result = await db.execute(query.offset(skip).limit(limit))
    patients = result.scalars().all()
    
    # Build responses
    patient_responses = []
    for patient in patients:
        user_result = await db.execute(select(User).where(User.id == patient.user_id))
        user = user_result.scalar_one()
        patient_responses.append(await build_patient_response(db, patient, user))
    
    return PatientListResponse(patients=patient_responses, total=total)


@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get patient details by ID.
    Authorization is checked based on user role.
    """
    patient = await get_patient_if_authorized(patient_id, current_user, db)
    user_result = await db.execute(select(User).where(User.id == patient.user_id))
    user = user_result.scalar_one()
    
    return await build_patient_response(db, patient, user)


@router.post("", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
async def create_patient(
    patient_data: PatientCreate,
    current_user: User = Depends(require_role(UserRole.DOCTOR)),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new patient profile. Only doctors can create patients.
    """
    # Verify user exists and is a patient role
    user_result = await db.execute(select(User).where(User.id == patient_data.user_id))
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role != UserRole.PATIENT:
        raise HTTPException(status_code=400, detail="User must have PATIENT role")
    
    # Check if patient profile already exists
    existing = await db.execute(select(Patient).where(Patient.user_id == patient_data.user_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Patient profile already exists for this user")
    
    patient = Patient(
        user_id=patient_data.user_id,
        date_of_birth=patient_data.date_of_birth,
        gender=patient_data.gender,
        blood_type=patient_data.blood_type,
        emergency_contact_name=patient_data.emergency_contact_name,
        emergency_contact_phone=patient_data.emergency_contact_phone,
        primary_doctor_id=patient_data.primary_doctor_id or current_user.id,
        caregiver_id=patient_data.caregiver_id,
        discharge_date=patient_data.discharge_date,
        condition_summary=patient_data.condition_summary,
        risk_level=patient_data.risk_level
    )
    db.add(patient)
    await db.flush()
    
    # Create default thresholds
    await create_default_thresholds(db, patient.id)
    
    await db.commit()
    await db.refresh(patient)
    
    return await build_patient_response(db, patient, user)


@router.put("/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: int,
    patient_data: PatientUpdate,
    current_user: User = Depends(require_role(UserRole.DOCTOR)),
    db: AsyncSession = Depends(get_db)
):
    """
    Update patient information. Only doctors can update.
    """
    result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = result.scalar_one_or_none()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Update fields
    update_data = patient_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(patient, field, value)
    
    await db.commit()
    await db.refresh(patient)
    
    user_result = await db.execute(select(User).where(User.id == patient.user_id))
    user = user_result.scalar_one()
    
    return await build_patient_response(db, patient, user)


# Alert Thresholds endpoints
@router.get("/{patient_id}/thresholds", response_model=List[AlertThresholdResponse])
async def get_thresholds(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get alert thresholds for a patient."""
    await get_patient_if_authorized(patient_id, current_user, db)
    
    result = await db.execute(
        select(AlertThreshold).where(AlertThreshold.patient_id == patient_id)
    )
    return result.scalars().all()


@router.put("/{patient_id}/thresholds/{vital_type}", response_model=AlertThresholdResponse)
async def update_threshold(
    patient_id: int,
    vital_type: str,
    threshold_data: AlertThresholdUpdate,
    current_user: User = Depends(require_role(UserRole.DOCTOR)),
    db: AsyncSession = Depends(get_db)
):
    """Update alert threshold for a patient. Only doctors can update."""
    result = await db.execute(
        select(AlertThreshold).where(
            and_(
                AlertThreshold.patient_id == patient_id,
                AlertThreshold.vital_type == vital_type
            )
        )
    )
    threshold = result.scalar_one_or_none()
    
    if not threshold:
        raise HTTPException(status_code=404, detail="Threshold not found")
    
    update_data = threshold_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(threshold, field, value)
    
    await db.commit()
    await db.refresh(threshold)
    
    return threshold
