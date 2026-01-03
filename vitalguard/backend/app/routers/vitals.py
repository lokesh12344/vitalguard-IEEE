from typing import List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.database import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.vital import VitalReading
from app.schemas.vital import (
    VitalCreate, VitalResponse, VitalTrendResponse, 
    VitalDataPoint, LatestVitalsResponse
)
from app.dependencies import get_current_user, get_patient_if_authorized
from app.services.alert import check_vital_and_create_alerts, get_thresholds_for_patient, check_threshold
from app.socket_manager import socket_manager

router = APIRouter(prefix="/vitals", tags=["Vitals"])


def get_vital_status(value: float, thresholds: dict) -> str:
    """Determine status of a vital value based on thresholds."""
    if value is None:
        return "unknown"
    
    severity, _, _ = check_threshold(value, thresholds)
    if severity is None:
        return "normal"
    return severity.value


@router.post("", response_model=VitalResponse)
async def create_vital_reading(
    vital_data: VitalCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new vital reading.
    This endpoint is used by the simulator and manual input.
    Triggers alert checking and real-time notifications.
    """
    # Get patient
    result = await db.execute(select(Patient).where(Patient.id == vital_data.patient_id))
    patient = result.scalar_one_or_none()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Create vital reading
    vital = VitalReading(
        patient_id=vital_data.patient_id,
        heart_rate=vital_data.heart_rate,
        spo2=vital_data.spo2,
        temperature=vital_data.temperature,
        blood_pressure_systolic=vital_data.blood_pressure_systolic,
        blood_pressure_diastolic=vital_data.blood_pressure_diastolic,
        respiratory_rate=vital_data.respiratory_rate,
        source=vital_data.source,
        device_id=vital_data.device_id,
    )
    db.add(vital)
    await db.flush()
    
    # Check thresholds and create alerts
    alerts = await check_vital_and_create_alerts(db, vital, patient, socket_manager)
    
    if alerts:
        vital.is_anomaly = True
    
    await db.commit()
    await db.refresh(vital)
    
    # Emit real-time update
    await socket_manager.emit_vital_update(patient.id, vital.to_dict())
    
    return vital


@router.get("/latest/{patient_id}", response_model=LatestVitalsResponse)
async def get_latest_vitals(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get the latest vital reading for a patient with status indicators."""
    await get_patient_if_authorized(patient_id, current_user, db)
    
    result = await db.execute(
        select(VitalReading)
        .where(VitalReading.patient_id == patient_id)
        .order_by(VitalReading.timestamp.desc())
        .limit(1)
    )
    vital = result.scalar_one_or_none()
    
    if not vital:
        raise HTTPException(status_code=404, detail="No vital readings found")
    
    # Get thresholds and determine status
    hr_thresholds = await get_thresholds_for_patient(db, patient_id, "heart_rate")
    spo2_thresholds = await get_thresholds_for_patient(db, patient_id, "spo2")
    temp_thresholds = await get_thresholds_for_patient(db, patient_id, "temperature")
    
    hr_status = get_vital_status(vital.heart_rate, hr_thresholds)
    spo2_status = get_vital_status(vital.spo2, spo2_thresholds)
    temp_status = get_vital_status(vital.temperature, temp_thresholds)
    
    # Determine overall status (worst of all)
    statuses = [hr_status, spo2_status, temp_status]
    if "critical" in statuses:
        overall_status = "critical"
    elif "warning" in statuses:
        overall_status = "warning"
    else:
        overall_status = "normal"
    
    bp = None
    if vital.blood_pressure_systolic and vital.blood_pressure_diastolic:
        bp = f"{vital.blood_pressure_systolic}/{vital.blood_pressure_diastolic}"
    
    return LatestVitalsResponse(
        patient_id=patient_id,
        timestamp=vital.timestamp,
        heart_rate=vital.heart_rate,
        heart_rate_status=hr_status,
        spo2=vital.spo2,
        spo2_status=spo2_status,
        temperature=vital.temperature,
        temperature_status=temp_status,
        blood_pressure=bp,
        blood_pressure_status="normal",
        overall_status=overall_status
    )


@router.get("/{patient_id}", response_model=List[VitalResponse])
async def get_vital_history(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    hours: int = Query(24, ge=1, le=168),  # 1 hour to 7 days
    limit: int = Query(500, ge=1, le=1000)
):
    """Get vital reading history for a patient."""
    await get_patient_if_authorized(patient_id, current_user, db)
    
    since = datetime.utcnow() - timedelta(hours=hours)
    
    result = await db.execute(
        select(VitalReading)
        .where(
            and_(
                VitalReading.patient_id == patient_id,
                VitalReading.timestamp >= since
            )
        )
        .order_by(VitalReading.timestamp.desc())
        .limit(limit)
    )
    
    return result.scalars().all()


@router.get("/{patient_id}/trends/{vital_type}", response_model=VitalTrendResponse)
async def get_vital_trends(
    patient_id: int,
    vital_type: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    period: str = Query("24h", regex="^(24h|7d|30d)$")
):
    """
    Get aggregated vital trends for charts.
    
    Args:
        vital_type: heart_rate, spo2, temperature
        period: 24h, 7d, 30d
    """
    await get_patient_if_authorized(patient_id, current_user, db)
    
    # Validate vital_type
    if vital_type not in ["heart_rate", "spo2", "temperature"]:
        raise HTTPException(status_code=400, detail="Invalid vital type")
    
    # Calculate time range
    hours_map = {"24h": 24, "7d": 168, "30d": 720}
    hours = hours_map[period]
    since = datetime.utcnow() - timedelta(hours=hours)
    
    # Get readings
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
    readings = result.scalars().all()
    
    # Extract data points
    data_points = []
    values = []
    
    for reading in readings:
        value = getattr(reading, vital_type)
        if value is not None:
            data_points.append(VitalDataPoint(timestamp=reading.timestamp, value=value))
            values.append(value)
    
    if not values:
        return VitalTrendResponse(
            patient_id=patient_id,
            vital_type=vital_type,
            period=period,
            data_points=[],
            min_value=0,
            max_value=0,
            avg_value=0
        )
    
    return VitalTrendResponse(
        patient_id=patient_id,
        vital_type=vital_type,
        period=period,
        data_points=data_points,
        min_value=min(values),
        max_value=max(values),
        avg_value=sum(values) / len(values)
    )
