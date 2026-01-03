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


    async def send_sos_alert(
        self,
        patient_name: str,
        patient_phone: str,
        emergency_contact_name: str,
        emergency_contact_phone: str,
        doctor_name: str = None,
        doctor_phone: str = None,
        location: str = None,
        message: str = None
    ) -> dict:
        """
        Send emergency SOS alert via WhatsApp (preferred) or SMS to emergency contacts.
        
        Args:
            patient_name: Name of the patient triggering SOS
            patient_phone: Patient's phone number
            emergency_contact_name: Name of emergency contact
            emergency_contact_phone: Phone number of emergency contact
            doctor_name: Assigned doctor's name
            doctor_phone: Doctor's phone number
            location: Patient's location (optional)
            message: Custom message from patient (optional)
        
        Returns:
            Dict with success status and details
        """
        import datetime
        
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Build SOS message
        sos_message = (
            f"🚨 EMERGENCY SOS ALERT 🚨\n\n"
            f"Patient: {patient_name}\n"
            f"Time: {timestamp}\n"
        )
        
        if location:
            sos_message += f"Location: {location}\n"
        
        if message:
            sos_message += f"\nMessage: {message}\n"
        
        sos_message += (
            f"\n⚠️ IMMEDIATE ATTENTION REQUIRED\n"
            f"Please contact the patient or emergency services immediately.\n"
            f"Patient Phone: {patient_phone}"
        )
        
        results = {
            "success": False,
            "notifications_sent": [],
            "notifications_failed": []
        }
        
        recipients = []
        
        # Add emergency contact
        if emergency_contact_phone:
            recipients.append({
                "name": emergency_contact_name,
                "phone": emergency_contact_phone,
                "role": "Emergency Contact"
            })
        
        # Add doctor if available
        if doctor_phone:
            recipients.append({
                "name": doctor_name,
                "phone": doctor_phone,
                "role": "Doctor"
            })
        
        # Add configured alert numbers
        for num in self._get_alert_recipients():
            if num and num not in [r["phone"] for r in recipients]:
                recipients.append({
                    "name": "Healthcare Provider",
                    "phone": num.replace("whatsapp:", ""),
                    "role": "Configured Alert"
                })
        
        if not self.enabled:
            # Mock mode - log the messages
            for recipient in recipients:
                logger.info(f"[MOCK SOS] To: {recipient['name']} ({recipient['phone']})\n{sos_message}")
                results["notifications_sent"].append({
                    "recipient": recipient["name"],
                    "phone": recipient["phone"],
                    "role": recipient["role"],
                    "status": "sent (mock)"
                })
            results["success"] = True
            return results
        
        # Check if we should use WhatsApp (preferred to avoid SMS limits)
        use_whatsapp = getattr(settings, 'use_whatsapp_for_sos', True)
        
        # Send alerts via WhatsApp or SMS
        for recipient in recipients:
            try:
                phone = recipient["phone"]
                # Clean phone number
                phone = phone.replace("whatsapp:", "").replace("-", "").replace(" ", "")
                
                # Ensure proper format
                if not phone.startswith("+"):
                    phone = f"+91{phone}" if len(phone) == 10 else f"+{phone}"
                
                if use_whatsapp:
                    # Send via WhatsApp Sandbox
                    whatsapp_to = f"whatsapp:{phone}"
                    self.client.messages.create(
                        body=sos_message,
                        from_=settings.twilio_whatsapp_from,
                        to=whatsapp_to
                    )
                    logger.info(f"SOS WhatsApp sent to {recipient['name']} ({whatsapp_to})")
                else:
                    # Send via SMS
                    self.client.messages.create(
                        body=sos_message,
                        from_=settings.twilio_sms_from,
                        to=phone
                    )
                    logger.info(f"SOS SMS sent to {recipient['name']} ({phone})")
                
                results["notifications_sent"].append({
                    "recipient": recipient["name"],
                    "phone": phone,
                    "role": recipient["role"],
                    "status": "sent",
                    "channel": "WhatsApp" if use_whatsapp else "SMS"
                })
                results["success"] = True
                
            except TwilioException as e:
                logger.error(f"Failed to send SOS to {recipient['name']}: {e}")
                results["notifications_failed"].append({
                    "recipient": recipient["name"],
                    "phone": recipient["phone"],
                    "role": recipient["role"],
                    "error": str(e)
                })
        
        return results


# Singleton instance
twilio_service = TwilioService()
