import logging
from typing import Optional, Tuple
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.patient import Patient, AlertThreshold
from app.models.vital import VitalReading
from app.models.alert import Alert, AlertType, AlertSeverity
from app.models.user import User
from app.services.twilio import twilio_service

logger = logging.getLogger(__name__)

# Default thresholds if not set for patient
DEFAULT_THRESHOLDS = {
    "heart_rate": {
        "min_warning": 50,
        "max_warning": 100,
        "min_critical": 40,
        "max_critical": 120,
    },
    "spo2": {
        "min_warning": 92,
        "max_warning": None,
        "min_critical": 88,
        "max_critical": None,
    },
    "temperature": {
        "min_warning": 36.0,
        "max_warning": 37.5,
        "min_critical": 35.0,
        "max_critical": 38.5,
    },
}


async def get_thresholds_for_patient(
    db: AsyncSession, patient_id: int, vital_type: str
) -> dict:
    """Get alert thresholds for a patient and vital type."""
    result = await db.execute(
        select(AlertThreshold).where(
            AlertThreshold.patient_id == patient_id,
            AlertThreshold.vital_type == vital_type
        )
    )
    threshold = result.scalar_one_or_none()
    
    if threshold:
        return {
            "min_warning": threshold.min_warning,
            "max_warning": threshold.max_warning,
            "min_critical": threshold.min_critical,
            "max_critical": threshold.max_critical,
        }
    
    return DEFAULT_THRESHOLDS.get(vital_type, {})


def check_threshold(
    value: float, thresholds: dict
) -> Tuple[Optional[AlertSeverity], Optional[str], Optional[float]]:
    """
    Check if a vital value breaches any threshold.
    
    Returns:
        Tuple of (severity, breach_type, threshold_value) or (None, None, None) if no breach
    """
    if value is None:
        return None, None, None
    
    min_critical = thresholds.get("min_critical")
    max_critical = thresholds.get("max_critical")
    min_warning = thresholds.get("min_warning")
    max_warning = thresholds.get("max_warning")
    
    # Check critical thresholds first
    if min_critical is not None and value < min_critical:
        return AlertSeverity.CRITICAL, "below_critical", min_critical
    if max_critical is not None and value > max_critical:
        return AlertSeverity.CRITICAL, "above_critical", max_critical
    
    # Check warning thresholds
    if min_warning is not None and value < min_warning:
        return AlertSeverity.WARNING, "below_warning", min_warning
    if max_warning is not None and value > max_warning:
        return AlertSeverity.WARNING, "above_warning", max_warning
    
    return None, None, None


async def check_vital_and_create_alerts(
    db: AsyncSession,
    vital_reading: VitalReading,
    patient: Patient,
    socket_manager=None
) -> list[Alert]:
    """
    Check a vital reading against thresholds and create alerts if needed.
    
    Args:
        db: Database session
        vital_reading: The vital reading to check
        patient: The patient
        socket_manager: Optional socket manager for real-time notifications
    
    Returns:
        List of created alerts
    """
    alerts = []
    
    # Get patient's name for notifications
    result = await db.execute(select(User).where(User.id == patient.user_id))
    user = result.scalar_one_or_none()
    patient_name = user.full_name if user else f"Patient {patient.id}"
    
    # Check each vital type
    vitals_to_check = [
        ("heart_rate", vital_reading.heart_rate),
        ("spo2", vital_reading.spo2),
        ("temperature", vital_reading.temperature),
    ]
    
    for vital_type, value in vitals_to_check:
        if value is None:
            continue
        
        thresholds = await get_thresholds_for_patient(db, patient.id, vital_type)
        severity, breach_type, threshold_value = check_threshold(value, thresholds)
        
        if severity is None:
            continue
        
        # Create alert
        vital_display = {
            "heart_rate": "Heart Rate",
            "spo2": "SpO2",
            "temperature": "Temperature"
        }.get(vital_type, vital_type)
        
        unit = {
            "heart_rate": "bpm",
            "spo2": "%",
            "temperature": "°C"
        }.get(vital_type, "")
        
        if "below" in breach_type:
            message = f"{vital_display} is too low: {value}{unit} (threshold: {threshold_value}{unit})"
        else:
            message = f"{vital_display} is too high: {value}{unit} (threshold: {threshold_value}{unit})"
        
        alert_type = AlertType.VITAL_CRITICAL if severity == AlertSeverity.CRITICAL else AlertType.VITAL_WARNING
        
        alert = Alert(
            patient_id=patient.id,
            vital_reading_id=vital_reading.id,
            alert_type=alert_type,
            severity=severity,
            message=message,
            vital_type=vital_type,
            vital_value=value,
            threshold_breached=threshold_value,
        )
        db.add(alert)
        alerts.append(alert)
        
        logger.warning(f"Alert created: {message} for patient {patient_name}")
        
        # Send notification for critical alerts
        if severity == AlertSeverity.CRITICAL:
            try:
                await twilio_service.send_whatsapp_alert(
                    patient_name=patient_name,
                    vital_type=vital_type,
                    vital_value=value,
                    severity=severity.value
                )
                alert.notification_sent = True
                alert.notification_channels = "whatsapp"
            except Exception as e:
                logger.error(f"Failed to send notification: {e}")
        
        # Emit socket event if manager provided
        if socket_manager:
            await socket_manager.emit_alert(patient.id, alert.to_dict())
    
    await db.flush()
    return alerts


async def create_default_thresholds(db: AsyncSession, patient_id: int):
    """Create default alert thresholds for a new patient."""
    for vital_type, thresholds in DEFAULT_THRESHOLDS.items():
        threshold = AlertThreshold(
            patient_id=patient_id,
            vital_type=vital_type,
            min_warning=thresholds["min_warning"],
            max_warning=thresholds["max_warning"],
            min_critical=thresholds["min_critical"],
            max_critical=thresholds["max_critical"],
        )
        db.add(threshold)
    await db.flush()
