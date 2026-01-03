from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from app.database import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.alert import Alert, AlertSeverity, AlertType
from app.schemas.alert import AlertResponse, AlertAcknowledge, AlertListResponse, AlertStats
from app.dependencies import get_current_user, require_role
from app.socket_manager import socket_manager

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("", response_model=AlertListResponse)
async def get_alerts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    patient_id: Optional[int] = Query(None),
    severity: Optional[AlertSeverity] = Query(None),
    acknowledged: Optional[bool] = Query(None),
    hours: int = Query(24, ge=1, le=168),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """
    Get alerts filtered by various criteria.
    - Doctors see alerts for their patients
    - Caregivers see alerts for their patients
    - Patients see only their own alerts
    """
    since = datetime.utcnow() - timedelta(hours=hours)
    
    # Base query
    query = select(Alert).where(Alert.created_at >= since)
    
    # Role-based filtering
    if current_user.role == UserRole.PATIENT:
        # Get patient's ID
        patient_result = await db.execute(
            select(Patient).where(Patient.user_id == current_user.id)
        )
        patient = patient_result.scalar_one_or_none()
        if patient:
            query = query.where(Alert.patient_id == patient.id)
        else:
            return AlertListResponse(alerts=[], total=0, unacknowledged_count=0)
    elif current_user.role == UserRole.DOCTOR:
        # Get all patient IDs for this doctor
        patients_result = await db.execute(
            select(Patient.id).where(Patient.primary_doctor_id == current_user.id)
        )
        patient_ids = [p[0] for p in patients_result.all()]
        if patient_ids:
            query = query.where(Alert.patient_id.in_(patient_ids))
        else:
            return AlertListResponse(alerts=[], total=0, unacknowledged_count=0)
    elif current_user.role == UserRole.CAREGIVER:
        patients_result = await db.execute(
            select(Patient.id).where(Patient.caregiver_id == current_user.id)
        )
        patient_ids = [p[0] for p in patients_result.all()]
        if patient_ids:
            query = query.where(Alert.patient_id.in_(patient_ids))
        else:
            return AlertListResponse(alerts=[], total=0, unacknowledged_count=0)
    
    # Optional filters
    if patient_id:
        query = query.where(Alert.patient_id == patient_id)
    if severity:
        query = query.where(Alert.severity == severity)
    if acknowledged is not None:
        query = query.where(Alert.is_acknowledged == acknowledged)
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Get unacknowledged count
    unack_query = query.where(Alert.is_acknowledged == False)
    unack_result = await db.execute(select(func.count()).select_from(unack_query.subquery()))
    unacknowledged_count = unack_result.scalar() or 0
    
    # Get paginated results
    result = await db.execute(
        query.order_by(Alert.created_at.desc()).offset(skip).limit(limit)
    )
    alerts = result.scalars().all()
    
    # Build response with patient names
    alert_responses = []
    for alert in alerts:
        patient_result = await db.execute(
            select(Patient).where(Patient.id == alert.patient_id)
        )
        patient = patient_result.scalar_one_or_none()
        patient_name = None
        if patient:
            user_result = await db.execute(select(User).where(User.id == patient.user_id))
            user = user_result.scalar_one_or_none()
            patient_name = user.full_name if user else None
        
        alert_responses.append(AlertResponse(
            id=alert.id,
            patient_id=alert.patient_id,
            patient_name=patient_name,
            alert_type=alert.alert_type,
            severity=alert.severity,
            message=alert.message,
            vital_type=alert.vital_type,
            vital_value=alert.vital_value,
            threshold_breached=alert.threshold_breached,
            is_acknowledged=alert.is_acknowledged,
            acknowledged_by=alert.acknowledged_by,
            acknowledged_at=alert.acknowledged_at,
            notification_sent=alert.notification_sent,
            created_at=alert.created_at
        ))
    
    return AlertListResponse(
        alerts=alert_responses,
        total=total,
        unacknowledged_count=unacknowledged_count
    )


@router.get("/stats", response_model=AlertStats)
async def get_alert_stats(
    current_user: User = Depends(require_role(UserRole.DOCTOR, UserRole.CAREGIVER)),
    db: AsyncSession = Depends(get_db)
):
    """Get alert statistics for dashboard."""
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Get patient IDs for current user
    if current_user.role == UserRole.DOCTOR:
        patients_result = await db.execute(
            select(Patient.id).where(Patient.primary_doctor_id == current_user.id)
        )
    else:
        patients_result = await db.execute(
            select(Patient.id).where(Patient.caregiver_id == current_user.id)
        )
    patient_ids = [p[0] for p in patients_result.all()]
    
    if not patient_ids:
        return AlertStats(
            total_alerts=0,
            critical_count=0,
            warning_count=0,
            unacknowledged_count=0,
            alerts_today=0
        )
    
    base_query = select(Alert).where(Alert.patient_id.in_(patient_ids))
    
    # Total alerts (last 7 days)
    week_ago = datetime.utcnow() - timedelta(days=7)
    total_result = await db.execute(
        select(func.count()).select_from(
            base_query.where(Alert.created_at >= week_ago).subquery()
        )
    )
    total_alerts = total_result.scalar() or 0
    
    # Critical count
    critical_result = await db.execute(
        select(func.count()).select_from(
            base_query.where(
                and_(
                    Alert.severity == AlertSeverity.CRITICAL,
                    Alert.is_acknowledged == False
                )
            ).subquery()
        )
    )
    critical_count = critical_result.scalar() or 0
    
    # Warning count
    warning_result = await db.execute(
        select(func.count()).select_from(
            base_query.where(
                and_(
                    Alert.severity == AlertSeverity.WARNING,
                    Alert.is_acknowledged == False
                )
            ).subquery()
        )
    )
    warning_count = warning_result.scalar() or 0
    
    # Unacknowledged count
    unack_result = await db.execute(
        select(func.count()).select_from(
            base_query.where(Alert.is_acknowledged == False).subquery()
        )
    )
    unacknowledged_count = unack_result.scalar() or 0
    
    # Today's alerts
    today_result = await db.execute(
        select(func.count()).select_from(
            base_query.where(Alert.created_at >= today).subquery()
        )
    )
    alerts_today = today_result.scalar() or 0
    
    return AlertStats(
        total_alerts=total_alerts,
        critical_count=critical_count,
        warning_count=warning_count,
        unacknowledged_count=unacknowledged_count,
        alerts_today=alerts_today
    )


@router.put("/{alert_id}/acknowledge", response_model=AlertResponse)
async def acknowledge_alert(
    alert_id: int,
    ack_data: AlertAcknowledge,
    current_user: User = Depends(require_role(UserRole.DOCTOR, UserRole.CAREGIVER)),
    db: AsyncSession = Depends(get_db)
):
    """Acknowledge an alert."""
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    # Verify access
    patient_result = await db.execute(select(Patient).where(Patient.id == alert.patient_id))
    patient = patient_result.scalar_one_or_none()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    if current_user.role == UserRole.DOCTOR and patient.primary_doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if current_user.role == UserRole.CAREGIVER and patient.caregiver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    alert.is_acknowledged = True
    alert.acknowledged_by = current_user.id
    alert.acknowledged_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(alert)
    
    # Emit socket event
    await socket_manager.emit_alert_acknowledged(alert.id, current_user.full_name)
    
    # Get patient name for response
    user_result = await db.execute(select(User).where(User.id == patient.user_id))
    user = user_result.scalar_one_or_none()
    patient_name = user.full_name if user else None
    
    return AlertResponse(
        id=alert.id,
        patient_id=alert.patient_id,
        patient_name=patient_name,
        alert_type=alert.alert_type,
        severity=alert.severity,
        message=alert.message,
        vital_type=alert.vital_type,
        vital_value=alert.vital_value,
        threshold_breached=alert.threshold_breached,
        is_acknowledged=alert.is_acknowledged,
        acknowledged_by=alert.acknowledged_by,
        acknowledged_at=alert.acknowledged_at,
        notification_sent=alert.notification_sent,
        created_at=alert.created_at
    )
