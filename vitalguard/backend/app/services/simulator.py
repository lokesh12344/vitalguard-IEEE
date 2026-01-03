"""
IoT-Ready Vital Signs Simulator Service

This service simulates realistic vital sign data that mimics IoT device output.
It can be seamlessly replaced with actual IoT device input without schema changes.
"""

import asyncio
import random
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.database import async_session
from app.models.patient import Patient, RiskLevel
from app.models.vital import VitalReading
from app.models.medication import MedicationLog, MedicationStatus, Medication
from app.models.alert import Alert, AlertType, AlertSeverity
from app.services.alert import check_vital_and_create_alerts
from app.socket_manager import socket_manager

logger = logging.getLogger(__name__)


# Realistic medical ranges for simulation
VITAL_RANGES = {
    "heart_rate": {
        "normal": {"min": 60, "max": 100},
        "elevated": {"min": 100, "max": 120},
        "low": {"min": 45, "max": 60},
    },
    "temperature": {
        "normal": {"min": 36.1, "max": 37.2},
        "fever": {"min": 37.5, "max": 39.0},
        "low": {"min": 35.0, "max": 36.0},
    },
    "spo2": {
        "normal": {"min": 95, "max": 100},
        "low": {"min": 88, "max": 94},
        "critical": {"min": 82, "max": 88},
    },
    "blood_pressure_systolic": {
        "normal": {"min": 110, "max": 130},
        "high": {"min": 130, "max": 160},
        "low": {"min": 85, "max": 110},
    },
    "blood_pressure_diastolic": {
        "normal": {"min": 70, "max": 85},
        "high": {"min": 85, "max": 100},
        "low": {"min": 55, "max": 70},
    },
    "respiratory_rate": {
        "normal": {"min": 12, "max": 20},
        "elevated": {"min": 20, "max": 30},
        "low": {"min": 8, "max": 12},
    },
}

# Patient condition profiles for realistic simulation
CONDITION_PROFILES = {
    "Hypertension": {
        "heart_rate": {"bias": "elevated", "probability": 0.3},
        "blood_pressure_systolic": {"bias": "high", "probability": 0.4},
        "blood_pressure_diastolic": {"bias": "high", "probability": 0.4},
    },
    "COPD": {
        "spo2": {"bias": "low", "probability": 0.4},
        "respiratory_rate": {"bias": "elevated", "probability": 0.3},
    },
    "Heart Failure": {
        "heart_rate": {"bias": "elevated", "probability": 0.3},
        "spo2": {"bias": "low", "probability": 0.3},
    },
    "Diabetes": {
        "temperature": {"bias": "normal", "probability": 0.1},
    },
    "Post-Surgery": {
        "heart_rate": {"bias": "elevated", "probability": 0.2},
        "temperature": {"bias": "fever", "probability": 0.15},
    },
    "default": {},
}


class VitalSimulator:
    """
    Simulates realistic IoT device vital sign data.
    
    The generated data follows the same schema as actual IoT devices,
    making it easy to swap simulation for real sensors.
    """
    
    def __init__(self):
        self.running = False
        self._task: Optional[asyncio.Task] = None
        self.simulation_interval = 8  # seconds between readings
        self._patient_states: Dict[int, Dict] = {}  # Track patient state for continuity
    
    def _get_patient_profile(self, condition: str) -> Dict:
        """Get the condition profile for simulation biases."""
        if not condition:
            return CONDITION_PROFILES["default"]
        
        for key in CONDITION_PROFILES:
            if key.lower() in condition.lower():
                return CONDITION_PROFILES[key]
        return CONDITION_PROFILES["default"]
    
    def _generate_vital_value(
        self,
        vital_type: str,
        profile: Dict,
        previous_value: Optional[float] = None
    ) -> float:
        """
        Generate a realistic vital value with continuity and condition biases.
        
        Uses previous value to ensure smooth transitions (no sudden jumps).
        """
        ranges = VITAL_RANGES.get(vital_type, {"normal": {"min": 0, "max": 100}})
        
        # Determine if we should use biased range
        use_bias = False
        bias_range = "normal"
        
        if vital_type in profile:
            if random.random() < profile[vital_type].get("probability", 0):
                use_bias = True
                bias_range = profile[vital_type].get("bias", "normal")
        
        # Select range
        selected_range = ranges.get(bias_range, ranges.get("normal"))
        
        # Generate value with smooth transition from previous
        if previous_value is not None:
            # Allow max 10% change from previous value
            max_change = (selected_range["max"] - selected_range["min"]) * 0.15
            new_min = max(selected_range["min"], previous_value - max_change)
            new_max = min(selected_range["max"], previous_value + max_change)
            value = random.uniform(new_min, new_max)
        else:
            value = random.uniform(selected_range["min"], selected_range["max"])
        
        # Round appropriately
        if vital_type in ["spo2", "heart_rate", "respiratory_rate"]:
            return round(value)
        elif vital_type == "temperature":
            return round(value, 1)
        else:
            return round(value)
    
    def generate_vital_payload(self, patient: Patient) -> Dict[str, Any]:
        """
        Generate an IoT-ready vital signs payload.
        
        This payload structure matches what an actual IoT device would send,
        allowing seamless transition from simulation to real devices.
        """
        patient_id = patient.id
        condition = patient.condition_summary or ""
        profile = self._get_patient_profile(condition)
        
        # Get or initialize patient state
        if patient_id not in self._patient_states:
            self._patient_states[patient_id] = {}
        
        state = self._patient_states[patient_id]
        
        # Generate vitals with continuity
        heart_rate = self._generate_vital_value(
            "heart_rate", profile, state.get("heart_rate")
        )
        temperature = self._generate_vital_value(
            "temperature", profile, state.get("temperature")
        )
        spo2 = self._generate_vital_value(
            "spo2", profile, state.get("spo2")
        )
        bp_systolic = self._generate_vital_value(
            "blood_pressure_systolic", profile, state.get("bp_systolic")
        )
        bp_diastolic = self._generate_vital_value(
            "blood_pressure_diastolic", profile, state.get("bp_diastolic")
        )
        respiratory_rate = self._generate_vital_value(
            "respiratory_rate", profile, state.get("respiratory_rate")
        )
        
        # Update state for next iteration
        self._patient_states[patient_id] = {
            "heart_rate": heart_rate,
            "temperature": temperature,
            "spo2": spo2,
            "bp_systolic": bp_systolic,
            "bp_diastolic": bp_diastolic,
            "respiratory_rate": respiratory_rate,
        }
        
        # Return IoT-compatible payload
        return {
            "patient_id": patient_id,
            "heart_rate": heart_rate,
            "temperature": temperature,
            "spo2": spo2,
            "blood_pressure_systolic": int(bp_systolic),
            "blood_pressure_diastolic": int(bp_diastolic),
            "respiratory_rate": respiratory_rate,
            "source": "SIMULATED_SENSOR",
            "device_id": f"SIM-DEVICE-{patient_id:04d}",
            "timestamp": datetime.utcnow().isoformat(),
        }
    
    async def _insert_vital_reading(
        self,
        db: AsyncSession,
        payload: Dict[str, Any],
        patient: Patient
    ) -> VitalReading:
        """Insert a vital reading and check for alerts."""
        vital = VitalReading(
            patient_id=payload["patient_id"],
            heart_rate=payload["heart_rate"],
            temperature=payload["temperature"],
            spo2=payload["spo2"],
            blood_pressure_systolic=payload["blood_pressure_systolic"],
            blood_pressure_diastolic=payload["blood_pressure_diastolic"],
            respiratory_rate=payload["respiratory_rate"],
            source=payload["source"],
            device_id=payload["device_id"],
        )
        db.add(vital)
        await db.flush()
        
        # Check thresholds and create alerts
        alerts = await check_vital_and_create_alerts(db, vital, patient, socket_manager)
        
        if alerts:
            vital.is_anomaly = True
            # Update patient risk level based on alerts
            await self._update_patient_risk(db, patient)
        
        await db.commit()
        await db.refresh(vital)
        
        # Emit real-time update via WebSocket
        await socket_manager.emit_vital_update(patient.id, vital.to_dict())
        
        return vital
    
    async def _update_patient_risk(self, db: AsyncSession, patient: Patient):
        """
        Update patient risk level based on recent alerts and vitals.
        
        Risk calculation:
        - HIGH: >2 critical alerts in last hour or SpO2 < 90
        - MEDIUM: >1 warning alert in last hour or any vital trending bad
        - LOW: No recent alerts, stable vitals
        """
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        
        # Count recent alerts by severity
        critical_result = await db.execute(
            select(func.count(Alert.id))
            .where(
                and_(
                    Alert.patient_id == patient.id,
                    Alert.severity == AlertSeverity.CRITICAL,
                    Alert.created_at >= one_hour_ago
                )
            )
        )
        critical_count = critical_result.scalar() or 0
        
        warning_result = await db.execute(
            select(func.count(Alert.id))
            .where(
                and_(
                    Alert.patient_id == patient.id,
                    Alert.severity == AlertSeverity.WARNING,
                    Alert.created_at >= one_hour_ago
                )
            )
        )
        warning_count = warning_result.scalar() or 0
        
        # Determine risk level
        if critical_count >= 2:
            new_risk = RiskLevel.CRITICAL
        elif critical_count >= 1 or warning_count >= 3:
            new_risk = RiskLevel.HIGH
        elif warning_count >= 1:
            new_risk = RiskLevel.MEDIUM
        else:
            new_risk = RiskLevel.LOW
        
        # Update if changed
        if patient.risk_level != new_risk:
            patient.risk_level = new_risk
            await db.commit()
            logger.info(f"Patient {patient.id} risk level updated to {new_risk.value}")
    
    async def _check_missed_medications(self, db: AsyncSession, patient: Patient):
        """Check for missed medications and create alerts."""
        now = datetime.utcnow()
        grace_period = timedelta(minutes=30)
        
        # Find pending medication logs that are past their scheduled time + grace period
        result = await db.execute(
            select(MedicationLog)
            .join(Medication)
            .where(
                and_(
                    MedicationLog.patient_id == patient.id,
                    MedicationLog.status == MedicationStatus.PENDING,
                    MedicationLog.scheduled_time < now - grace_period
                )
            )
        )
        pending_logs = result.scalars().all()
        
        for log in pending_logs:
            # Mark as missed
            log.status = MedicationStatus.MISSED
            
            # Get medication name
            med_result = await db.execute(
                select(Medication).where(Medication.id == log.medication_id)
            )
            medication = med_result.scalar_one_or_none()
            med_name = medication.name if medication else "Unknown medication"
            
            # Create missed medication alert
            alert = Alert(
                patient_id=patient.id,
                alert_type=AlertType.MEDICATION_MISSED,
                severity=AlertSeverity.WARNING,
                message=f"Missed medication: {med_name} was scheduled at {log.scheduled_time.strftime('%H:%M')}",
            )
            db.add(alert)
            
            # Emit alert via WebSocket
            await db.flush()
            await socket_manager.emit_alert(patient.id, alert.to_dict())
            
            logger.warning(f"Medication missed alert for patient {patient.id}: {med_name}")
        
        if pending_logs:
            await db.commit()
    
    async def _run_simulation_cycle(self):
        """Run one cycle of simulation for all patients."""
        async with async_session() as db:
            try:
                # Get all active patients
                result = await db.execute(select(Patient))
                patients = result.scalars().all()
                
                for patient in patients:
                    try:
                        # Generate and insert vital reading
                        payload = self.generate_vital_payload(patient)
                        await self._insert_vital_reading(db, payload, patient)
                        
                        # Check for missed medications
                        await self._check_missed_medications(db, patient)
                        
                        logger.debug(f"Simulated vitals for patient {patient.id}")
                    
                    except Exception as e:
                        logger.error(f"Error simulating patient {patient.id}: {e}")
                        continue
                
            except Exception as e:
                logger.error(f"Error in simulation cycle: {e}")
    
    async def start(self):
        """Start the vital signs simulation service."""
        if self.running:
            logger.warning("Simulator already running")
            return
        
        self.running = True
        logger.info(f"Starting vital simulator (interval: {self.simulation_interval}s)")
        
        while self.running:
            try:
                await self._run_simulation_cycle()
            except Exception as e:
                logger.error(f"Simulation cycle error: {e}")
            
            await asyncio.sleep(self.simulation_interval)
    
    async def stop(self):
        """Stop the simulation service."""
        self.running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Vital simulator stopped")
    
    def run_in_background(self):
        """Start the simulator as a background task."""
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self.start())
            logger.info("Simulator started in background")
        return self._task


# Singleton instance
vital_simulator = VitalSimulator()
