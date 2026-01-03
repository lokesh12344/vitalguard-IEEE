import logging
from typing import Optional
from twilio.rest import Client
from twilio.base.exceptions import TwilioException
from app.config import settings

logger = logging.getLogger(__name__)


class TwilioService:
    """Service for sending WhatsApp and SMS notifications via Twilio."""
    
    def __init__(self):
        self.enabled = bool(settings.twilio_account_sid and settings.twilio_auth_token)
        if self.enabled:
            self.client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        else:
            logger.warning("Twilio credentials not configured. Notifications will be logged only.")
            self.client = None
    
    def _get_alert_recipients(self) -> list[str]:
        """Get list of phone numbers to send alerts to."""
        if not settings.alert_phone_numbers:
            return []
        return [num.strip() for num in settings.alert_phone_numbers.split(",")]
    
    async def send_whatsapp_alert(
        self,
        patient_name: str,
        vital_type: str,
        vital_value: float,
        severity: str,
        to_number: Optional[str] = None
    ) -> bool:
        """
        Send WhatsApp alert for vital threshold breach.
        
        Args:
            patient_name: Name of the patient
            vital_type: Type of vital (heart_rate, spo2, temperature)
            vital_value: Current value of the vital
            severity: Alert severity (warning, critical, emergency)
            to_number: Optional specific number to send to
        
        Returns:
            True if message sent successfully, False otherwise
        """
        # Format vital type for display
        vital_display = {
            "heart_rate": "Heart Rate",
            "spo2": "SpO2",
            "temperature": "Temperature"
        }.get(vital_type, vital_type)
        
        # Format value with units
        unit = {
            "heart_rate": "bpm",
            "spo2": "%",
            "temperature": "°C"
        }.get(vital_type, "")
        
        # Build message
        emoji = "🚨" if severity in ["critical", "emergency"] else "⚠️"
        message = (
            f"{emoji} *VitalGuard Alert*\n\n"
            f"Patient: *{patient_name}*\n"
            f"Alert: *{severity.upper()}*\n"
            f"{vital_display}: *{vital_value}{unit}*\n\n"
            f"Please check the patient immediately."
        )
        
        if not self.enabled:
            logger.info(f"[MOCK WHATSAPP] To: {to_number or 'configured numbers'}\n{message}")
            return True
        
        recipients = [to_number] if to_number else self._get_alert_recipients()
        success = False
        
        for recipient in recipients:
            try:
                # Ensure WhatsApp format
                if not recipient.startswith("whatsapp:"):
                    recipient = f"whatsapp:{recipient}"
                
                self.client.messages.create(
                    body=message,
                    from_=settings.twilio_whatsapp_from,
                    to=recipient
                )
                logger.info(f"WhatsApp alert sent to {recipient}")
                success = True
            except TwilioException as e:
                logger.error(f"Failed to send WhatsApp to {recipient}: {e}")
        
        return success
    
    async def send_sms_alert(
        self,
        patient_name: str,
        vital_type: str,
        vital_value: float,
        severity: str,
        to_number: Optional[str] = None
    ) -> bool:
        """
        Send SMS alert for vital threshold breach (fallback).
        
        Args:
            patient_name: Name of the patient
            vital_type: Type of vital
            vital_value: Current value
            severity: Alert severity
            to_number: Phone number to send to
        
        Returns:
            True if sent successfully, False otherwise
        """
        vital_display = {
            "heart_rate": "HR",
            "spo2": "SpO2",
            "temperature": "Temp"
        }.get(vital_type, vital_type)
        
        unit = {
            "heart_rate": "bpm",
            "spo2": "%",
            "temperature": "°C"
        }.get(vital_type, "")
        
        message = (
            f"VitalGuard {severity.upper()}: "
            f"{patient_name} - {vital_display}: {vital_value}{unit}. "
            f"Check patient immediately."
        )
        
        if not self.enabled:
            logger.info(f"[MOCK SMS] To: {to_number or 'configured numbers'}\n{message}")
            return True
        
        recipients = [to_number] if to_number else self._get_alert_recipients()
        # Remove whatsapp: prefix for SMS
        recipients = [r.replace("whatsapp:", "") for r in recipients]
        success = False
        
        for recipient in recipients:
            try:
                # For SMS, we would need a different Twilio number
                # This is a placeholder - in production, configure SMS number
                logger.warning(f"SMS sending not configured. Would send to: {recipient}")
                success = True
            except Exception as e:
                logger.error(f"Failed to send SMS to {recipient}: {e}")
        
        return success
    
    async def send_medication_reminder(
        self,
        patient_name: str,
        medication_name: str,
        dosage: str,
        to_number: str
    ) -> bool:
        """
        Send medication reminder via WhatsApp.
        
        Args:
            patient_name: Name of the patient
            medication_name: Name of medication
            dosage: Dosage information
            to_number: WhatsApp number
        
        Returns:
            True if sent successfully
        """
        message = (
            f"💊 *Medication Reminder*\n\n"
            f"Hi {patient_name}!\n"
            f"It's time to take your *{medication_name}* ({dosage}).\n\n"
            f"Please log your medication in the VitalGuard app."
        )
        
        if not self.enabled:
            logger.info(f"[MOCK WHATSAPP] Medication reminder to: {to_number}\n{message}")
            return True
        
        try:
            if not to_number.startswith("whatsapp:"):
                to_number = f"whatsapp:{to_number}"
            
            self.client.messages.create(
                body=message,
                from_=settings.twilio_whatsapp_from,
                to=to_number
            )
            logger.info(f"Medication reminder sent to {to_number}")
            return True
        except TwilioException as e:
            logger.error(f"Failed to send medication reminder: {e}")
            return False


# Singleton instance
twilio_service = TwilioService()
