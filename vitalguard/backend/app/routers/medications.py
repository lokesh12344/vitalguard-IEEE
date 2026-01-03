from typing import List
from datetime import datetime, date, timedelta
import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from app.database import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.medication import Medication, MedicationLog, MedicationStatus
from app.schemas.medication import (
    MedicationCreate, MedicationUpdate, MedicationResponse,
    MedicationLogCreate, MedicationLogResponse, MedicationAdherenceResponse,
    TodayMedicationResponse
)
from app.dependencies import get_current_user, require_role, get_patient_if_authorized, get_current_patient

router = APIRouter(prefix="/medications", tags=["Medications"])


@router.get("/{patient_id}", response_model=List[MedicationResponse])
async def get_patient_medications(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    active_only: bool = Query(True)
):
    """Get all medications for a patient."""
    await get_patient_if_authorized(patient_id, current_user, db)
    
    query = select(Medication).where(Medication.patient_id == patient_id)
    if active_only:
        query = query.where(Medication.is_active == True)
    
    result = await db.execute(query.order_by(Medication.name))
    return result.scalars().all()


@router.post("", response_model=MedicationResponse, status_code=201)
async def create_medication(
    med_data: MedicationCreate,
    current_user: User = Depends(require_role(UserRole.DOCTOR)),
    db: AsyncSession = Depends(get_db)
):
    """Create a new medication for a patient. Only doctors can create."""
    # Verify patient exists
    result = await db.execute(select(Patient).where(Patient.id == med_data.patient_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Patient not found")
    
    medication = Medication(
        patient_id=med_data.patient_id,
        name=med_data.name,
        dosage=med_data.dosage,
        frequency=med_data.frequency,
        schedule_times=med_data.schedule_times,
        start_date=med_data.start_date,
        end_date=med_data.end_date,
        instructions=med_data.instructions
    )
    db.add(medication)
    await db.commit()
    await db.refresh(medication)
    
    return medication


@router.put("/{medication_id}", response_model=MedicationResponse)
async def update_medication(
    medication_id: int,
    med_data: MedicationUpdate,
    current_user: User = Depends(require_role(UserRole.DOCTOR)),
    db: AsyncSession = Depends(get_db)
):
    """Update a medication. Only doctors can update."""
    result = await db.execute(select(Medication).where(Medication.id == medication_id))
    medication = result.scalar_one_or_none()
    
    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")
    
    update_data = med_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(medication, field, value)
    
    await db.commit()
    await db.refresh(medication)
    
    return medication


@router.delete("/{medication_id}")
async def delete_medication(
    medication_id: int,
    current_user: User = Depends(require_role(UserRole.DOCTOR)),
    db: AsyncSession = Depends(get_db)
):
    """Soft delete (deactivate) a medication."""
    result = await db.execute(select(Medication).where(Medication.id == medication_id))
    medication = result.scalar_one_or_none()
    
    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")
    
    medication.is_active = False
    await db.commit()
    
    return {"message": "Medication deactivated"}


@router.get("/{patient_id}/today", response_model=List[TodayMedicationResponse])
async def get_today_medications(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get today's medication schedule for a patient with status."""
    await get_patient_if_authorized(patient_id, current_user, db)
    
    today = date.today()
    today_start = datetime.combine(today, datetime.min.time())
    today_end = datetime.combine(today, datetime.max.time())
    
    # Get active medications
    med_result = await db.execute(
        select(Medication)
        .where(
            and_(
                Medication.patient_id == patient_id,
                Medication.is_active == True,
                Medication.start_date <= today,
                or_(Medication.end_date == None, Medication.end_date >= today)
            )
        )
    )
    medications = med_result.scalars().all()
    
    today_meds = []
    
    for med in medications:
        # Parse schedule times (stored as JSON array string like '["08:00", "20:00"]')
        try:
            schedule_times = json.loads(med.schedule_times) if med.schedule_times else ["08:00"]
        except json.JSONDecodeError:
            schedule_times = ["08:00"]
        
        for time_str in schedule_times:
            try:
                hour, minute = map(int, time_str.split(":"))
                scheduled_dt = datetime.combine(today, datetime.min.time().replace(hour=hour, minute=minute))
            except (ValueError, AttributeError):
                scheduled_dt = datetime.combine(today, datetime.min.time().replace(hour=8))
            
            # Check if there's a log for this scheduled time
            log_result = await db.execute(
                select(MedicationLog)
                .where(
                    and_(
                        MedicationLog.medication_id == med.id,
                        MedicationLog.scheduled_time >= today_start,
                        MedicationLog.scheduled_time <= today_end
                    )
                )
            )
            log = log_result.scalar_one_or_none()
            
            status = MedicationStatus.PENDING
            taken_time = None
            log_id = None
            
            if log:
                status = log.status
                taken_time = log.taken_time
                log_id = log.id
            elif scheduled_dt < datetime.now() - timedelta(hours=1):
                # If scheduled time passed more than 1 hour ago and not logged, mark as missed
                status = MedicationStatus.MISSED
            
            today_meds.append(TodayMedicationResponse(
                id=log_id or 0,
                medication_id=med.id,
                medication_name=med.name,
                dosage=med.dosage,
                scheduled_time=scheduled_dt,
                status=status,
                taken_time=taken_time,
                instructions=med.instructions
            ))
    
    # Sort by scheduled time
    today_meds.sort(key=lambda x: x.scheduled_time)
    
    return today_meds


@router.post("/{medication_id}/log", response_model=MedicationLogResponse)
async def log_medication(
    medication_id: int,
    log_data: MedicationLogCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Log medication as taken, missed, or skipped."""
    # Get medication
    result = await db.execute(select(Medication).where(Medication.id == medication_id))
    medication = result.scalar_one_or_none()
    
    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")
    
    # Verify access
    await get_patient_if_authorized(medication.patient_id, current_user, db)
    
    # Check for existing log at this scheduled time
    today = log_data.scheduled_time.date()
    today_start = datetime.combine(today, datetime.min.time())
    today_end = datetime.combine(today, datetime.max.time())
    
    existing_result = await db.execute(
        select(MedicationLog)
        .where(
            and_(
                MedicationLog.medication_id == medication_id,
                MedicationLog.scheduled_time >= today_start,
                MedicationLog.scheduled_time <= today_end
            )
        )
    )
    existing_log = existing_result.scalar_one_or_none()
    
    if existing_log:
        # Update existing log
        existing_log.status = log_data.status
        existing_log.taken_time = log_data.taken_time or datetime.utcnow()
        existing_log.notes = log_data.notes
        existing_log.logged_via = log_data.logged_via
        await db.commit()
        await db.refresh(existing_log)
        log = existing_log
    else:
        # Create new log
        log = MedicationLog(
            medication_id=medication_id,
            patient_id=medication.patient_id,
            scheduled_time=log_data.scheduled_time,
            taken_time=log_data.taken_time or datetime.utcnow() if log_data.status == MedicationStatus.TAKEN else None,
            status=log_data.status,
            notes=log_data.notes,
            logged_via=log_data.logged_via
        )
        db.add(log)
        await db.commit()
        await db.refresh(log)
    
    return MedicationLogResponse(
        id=log.id,
        medication_id=log.medication_id,
        patient_id=log.patient_id,
        medication_name=medication.name,
        scheduled_time=log.scheduled_time,
        taken_time=log.taken_time,
        status=log.status,
        notes=log.notes,
        logged_via=log.logged_via,
        created_at=log.created_at
    )


@router.get("/{medication_id}/adherence", response_model=MedicationAdherenceResponse)
async def get_medication_adherence(
    medication_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    days: int = Query(30, ge=1, le=90)
):
    """Get medication adherence statistics."""
    result = await db.execute(select(Medication).where(Medication.id == medication_id))
    medication = result.scalar_one_or_none()
    
    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")
    
    await get_patient_if_authorized(medication.patient_id, current_user, db)
    
    since = datetime.utcnow() - timedelta(days=days)
    
    # Count logs by status
    logs_result = await db.execute(
        select(MedicationLog)
        .where(
            and_(
                MedicationLog.medication_id == medication_id,
                MedicationLog.created_at >= since
            )
        )
    )
    logs = logs_result.scalars().all()
    
    taken = sum(1 for log in logs if log.status == MedicationStatus.TAKEN)
    missed = sum(1 for log in logs if log.status == MedicationStatus.MISSED)
    skipped = sum(1 for log in logs if log.status == MedicationStatus.SKIPPED)
    total = taken + missed + skipped
    
    adherence_rate = (taken / total * 100) if total > 0 else 0
    
    return MedicationAdherenceResponse(
        medication_id=medication_id,
        medication_name=medication.name,
        total_scheduled=total,
        taken_count=taken,
        missed_count=missed,
        skipped_count=skipped,
        adherence_rate=round(adherence_rate, 1)
    )
