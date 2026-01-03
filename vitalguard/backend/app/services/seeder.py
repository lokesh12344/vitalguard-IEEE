"""
Database Seeder for VitalGuard

Seeds the database with realistic initial data for doctors, caretakers,
patients, medications, and initial vital readings.
"""

import asyncio
import logging
from datetime import datetime, date, timedelta
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from passlib.context import CryptContext

from app.database import async_session, init_db
from app.models.user import User, UserRole
from app.models.patient import Patient, RiskLevel, AlertThreshold
from app.models.medication import Medication, MedicationLog, MedicationStatus
from app.models.vital import VitalReading
from app.models.alert import Alert, AlertType, AlertSeverity

logger = logging.getLogger(__name__)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# Seed data for doctors
DOCTORS = [
    {
        "email": "dr.sharma@vitalguard.com",
        "full_name": "Dr. Priya Sharma",
        "phone": "+91-9876543210",
        "password": "doctor123",
    },
    {
        "email": "dr.patel@vitalguard.com",
        "full_name": "Dr. Rajesh Patel",
        "phone": "+91-9876543211",
        "password": "doctor123",
    },
    {
        "email": "dr.kumar@vitalguard.com",
        "full_name": "Dr. Amit Kumar",
        "phone": "+91-9876543212",
        "password": "doctor123",
    },
]

# Seed data for caretakers
CARETAKERS = [
    {
        "email": "caretaker1@vitalguard.com",
        "full_name": "Meera Singh",
        "phone": "+91-9876543220",
        "password": "care123",
    },
    {
        "email": "caretaker2@vitalguard.com",
        "full_name": "Rahul Verma",
        "phone": "+91-9876543221",
        "password": "care123",
    },
    {
        "email": "caretaker3@vitalguard.com",
        "full_name": "Sunita Devi",
        "phone": "+91-9876543222",
        "password": "care123",
    },
]

# Seed data for patients
PATIENTS = [
    {
        "email": "patient1@vitalguard.com",
        "full_name": "Ramesh Gupta",
        "phone": "+91-9876543230",
        "password": "patient123",
        "date_of_birth": date(1955, 3, 15),
        "gender": "Male",
        "blood_type": "A+",
        "condition_summary": "Hypertension, Type 2 Diabetes",
        "emergency_contact_name": "Suresh Gupta",
        "emergency_contact_phone": "+91-9876543240",
        "risk_level": RiskLevel.MEDIUM,
    },
    {
        "email": "patient2@vitalguard.com",
        "full_name": "Lakshmi Iyer",
        "phone": "+91-9876543231",
        "password": "patient123",
        "date_of_birth": date(1948, 7, 22),
        "gender": "Female",
        "blood_type": "B+",
        "condition_summary": "COPD, Chronic Bronchitis",
        "emergency_contact_name": "Venkat Iyer",
        "emergency_contact_phone": "+91-9876543241",
        "risk_level": RiskLevel.HIGH,
    },
    {
        "email": "patient3@vitalguard.com",
        "full_name": "Mohammad Khan",
        "phone": "+91-9876543232",
        "password": "patient123",
        "date_of_birth": date(1960, 11, 8),
        "gender": "Male",
        "blood_type": "O+",
        "condition_summary": "Heart Failure, Arrhythmia",
        "emergency_contact_name": "Fatima Khan",
        "emergency_contact_phone": "+91-9876543242",
        "risk_level": RiskLevel.HIGH,
    },
    {
        "email": "patient4@vitalguard.com",
        "full_name": "Anita Desai",
        "phone": "+91-9876543233",
        "password": "patient123",
        "date_of_birth": date(1970, 5, 30),
        "gender": "Female",
        "blood_type": "AB+",
        "condition_summary": "Post-Surgery Recovery, Mild Diabetes",
        "emergency_contact_name": "Vinod Desai",
        "emergency_contact_phone": "+91-9876543243",
        "risk_level": RiskLevel.MEDIUM,
    },
    {
        "email": "patient5@vitalguard.com",
        "full_name": "Sanjay Reddy",
        "phone": "+91-9876543234",
        "password": "patient123",
        "date_of_birth": date(1965, 9, 12),
        "gender": "Male",
        "blood_type": "A-",
        "condition_summary": "Hypertension, Obesity",
        "emergency_contact_name": "Kavitha Reddy",
        "emergency_contact_phone": "+91-9876543244",
        "risk_level": RiskLevel.LOW,
    },
]

# Medications per condition
MEDICATIONS_BY_CONDITION = {
    "Hypertension": [
        {"name": "Amlodipine", "dosage": "5mg", "frequency": "Once daily", "schedule_times": "08:00"},
        {"name": "Losartan", "dosage": "50mg", "frequency": "Once daily", "schedule_times": "08:00"},
    ],
    "Diabetes": [
        {"name": "Metformin", "dosage": "500mg", "frequency": "Twice daily", "schedule_times": "08:00,20:00"},
        {"name": "Glimepiride", "dosage": "2mg", "frequency": "Once daily", "schedule_times": "07:30"},
    ],
    "COPD": [
        {"name": "Salbutamol Inhaler", "dosage": "2 puffs", "frequency": "As needed", "schedule_times": "08:00,14:00,20:00"},
        {"name": "Tiotropium", "dosage": "18mcg", "frequency": "Once daily", "schedule_times": "08:00"},
    ],
    "Heart Failure": [
        {"name": "Carvedilol", "dosage": "12.5mg", "frequency": "Twice daily", "schedule_times": "08:00,20:00"},
        {"name": "Furosemide", "dosage": "40mg", "frequency": "Once daily", "schedule_times": "08:00"},
        {"name": "Digoxin", "dosage": "0.25mg", "frequency": "Once daily", "schedule_times": "08:00"},
    ],
    "Post-Surgery": [
        {"name": "Paracetamol", "dosage": "500mg", "frequency": "Three times daily", "schedule_times": "08:00,14:00,20:00"},
        {"name": "Omeprazole", "dosage": "20mg", "frequency": "Once daily", "schedule_times": "07:30"},
    ],
}

# Default alert thresholds
DEFAULT_THRESHOLDS = {
    "heart_rate": {"min_warning": 50, "max_warning": 100, "min_critical": 40, "max_critical": 120},
    "spo2": {"min_warning": 92, "max_warning": None, "min_critical": 88, "max_critical": None},
    "temperature": {"min_warning": 36.0, "max_warning": 37.5, "min_critical": 35.0, "max_critical": 38.5},
}


async def seed_users(db: AsyncSession) -> dict:
    """Seed doctors, caretakers, and patients."""
    users = {"doctors": [], "caretakers": [], "patients": []}
    
    # Seed doctors
    for doc_data in DOCTORS:
        existing = await db.execute(select(User).where(User.email == doc_data["email"]))
        if existing.scalar_one_or_none():
            logger.info(f"Doctor {doc_data['email']} already exists, skipping")
            result = await db.execute(select(User).where(User.email == doc_data["email"]))
            users["doctors"].append(result.scalar_one())
            continue
        
        user = User(
            email=doc_data["email"],
            full_name=doc_data["full_name"],
            phone=doc_data["phone"],
            hashed_password=pwd_context.hash(doc_data["password"]),
            role=UserRole.DOCTOR,
        )
        db.add(user)
        await db.flush()
        users["doctors"].append(user)
        logger.info(f"Created doctor: {user.full_name}")
    
    # Seed caretakers
    for care_data in CARETAKERS:
        existing = await db.execute(select(User).where(User.email == care_data["email"]))
        if existing.scalar_one_or_none():
            logger.info(f"Caretaker {care_data['email']} already exists, skipping")
            result = await db.execute(select(User).where(User.email == care_data["email"]))
            users["caretakers"].append(result.scalar_one())
            continue
        
        user = User(
            email=care_data["email"],
            full_name=care_data["full_name"],
            phone=care_data["phone"],
            hashed_password=pwd_context.hash(care_data["password"]),
            role=UserRole.CAREGIVER,
        )
        db.add(user)
        await db.flush()
        users["caretakers"].append(user)
        logger.info(f"Created caretaker: {user.full_name}")
    
    # Seed patients
    for i, patient_data in enumerate(PATIENTS):
        existing = await db.execute(select(User).where(User.email == patient_data["email"]))
        if existing.scalar_one_or_none():
            logger.info(f"Patient {patient_data['email']} already exists, skipping")
            result = await db.execute(select(User).where(User.email == patient_data["email"]))
            users["patients"].append(result.scalar_one())
            continue
        
        user = User(
            email=patient_data["email"],
            full_name=patient_data["full_name"],
            phone=patient_data["phone"],
            hashed_password=pwd_context.hash(patient_data["password"]),
            role=UserRole.PATIENT,
        )
        db.add(user)
        await db.flush()
        
        # Create patient profile
        patient = Patient(
            user_id=user.id,
            date_of_birth=patient_data["date_of_birth"],
            gender=patient_data["gender"],
            blood_type=patient_data["blood_type"],
            condition_summary=patient_data["condition_summary"],
            emergency_contact_name=patient_data["emergency_contact_name"],
            emergency_contact_phone=patient_data["emergency_contact_phone"],
            risk_level=patient_data["risk_level"],
            primary_doctor_id=users["doctors"][i % len(users["doctors"])].id,
            caregiver_id=users["caretakers"][i % len(users["caretakers"])].id,
        )
        db.add(patient)
        await db.flush()
        
        # Create alert thresholds
        for vital_type, thresholds in DEFAULT_THRESHOLDS.items():
            threshold = AlertThreshold(
                patient_id=patient.id,
                vital_type=vital_type,
                min_warning=thresholds["min_warning"],
                max_warning=thresholds["max_warning"],
                min_critical=thresholds["min_critical"],
                max_critical=thresholds["max_critical"],
            )
            db.add(threshold)
        
        users["patients"].append(user)
        logger.info(f"Created patient: {user.full_name} with profile ID {patient.id}")
    
    await db.commit()
    return users


async def seed_medications(db: AsyncSession):
    """Seed medications for patients based on their conditions."""
    result = await db.execute(select(Patient))
    patients = result.scalars().all()
    
    for patient in patients:
        # Check if patient already has medications
        existing = await db.execute(
            select(func.count(Medication.id)).where(Medication.patient_id == patient.id)
        )
        if existing.scalar() > 0:
            logger.info(f"Patient {patient.id} already has medications, skipping")
            continue
        
        condition = patient.condition_summary or ""
        
        # Find matching medications
        for condition_key, meds in MEDICATIONS_BY_CONDITION.items():
            if condition_key.lower() in condition.lower():
                for med_data in meds:
                    medication = Medication(
                        patient_id=patient.id,
                        name=med_data["name"],
                        dosage=med_data["dosage"],
                        frequency=med_data["frequency"],
                        schedule_times=med_data["schedule_times"],
                        start_date=date.today() - timedelta(days=30),
                        is_active=True,
                    )
                    db.add(medication)
                    logger.info(f"Added medication {med_data['name']} for patient {patient.id}")
    
    await db.commit()


async def seed_medication_logs(db: AsyncSession):
    """Create medication log entries for today and generate schedules."""
    result = await db.execute(select(Medication).where(Medication.is_active == True))
    medications = result.scalars().all()
    
    today = date.today()
    now = datetime.utcnow()
    
    for med in medications:
        # Check if logs exist for today
        existing = await db.execute(
            select(func.count(MedicationLog.id))
            .where(
                MedicationLog.medication_id == med.id,
                func.date(MedicationLog.scheduled_time) == today
            )
        )
        if existing.scalar() > 0:
            continue
        
        # Parse schedule times
        if not med.schedule_times:
            continue
        
        for time_str in med.schedule_times.split(","):
            try:
                hour, minute = map(int, time_str.strip().split(":"))
                scheduled_time = datetime(today.year, today.month, today.day, hour, minute)
                
                # Determine status based on current time
                if scheduled_time < now - timedelta(minutes=30):
                    # Past schedules - randomly mark as taken or missed
                    import random
                    if random.random() < 0.85:  # 85% adherence rate
                        status = MedicationStatus.TAKEN
                        taken_time = scheduled_time + timedelta(minutes=random.randint(0, 15))
                    else:
                        status = MedicationStatus.MISSED
                        taken_time = None
                else:
                    status = MedicationStatus.PENDING
                    taken_time = None
                
                log = MedicationLog(
                    medication_id=med.id,
                    patient_id=med.patient_id,
                    scheduled_time=scheduled_time,
                    taken_time=taken_time,
                    status=status,
                )
                db.add(log)
            except ValueError:
                continue
    
    await db.commit()
    logger.info("Seeded medication logs")


async def seed_initial_vitals(db: AsyncSession):
    """Seed initial vital readings for the past 24 hours."""
    import random
    
    result = await db.execute(select(Patient))
    patients = result.scalars().all()
    
    for patient in patients:
        # Check if patient already has vitals
        existing = await db.execute(
            select(func.count(VitalReading.id)).where(VitalReading.patient_id == patient.id)
        )
        if existing.scalar() > 0:
            logger.info(f"Patient {patient.id} already has vitals, skipping")
            continue
        
        # Generate 24 hours of data (every 30 minutes = 48 readings)
        now = datetime.utcnow()
        
        # Base values based on condition
        condition = patient.condition_summary or ""
        base_hr = 75 if "Hypertension" in condition else 70
        base_spo2 = 94 if "COPD" in condition else 97
        base_temp = 37.0
        
        for i in range(48):
            timestamp = now - timedelta(minutes=30 * (48 - i))
            
            # Add some variation
            heart_rate = base_hr + random.randint(-10, 15)
            spo2 = min(100, base_spo2 + random.randint(-3, 4))
            temperature = round(base_temp + random.uniform(-0.5, 0.8), 1)
            bp_systolic = 125 + random.randint(-15, 25)
            bp_diastolic = 80 + random.randint(-10, 15)
            respiratory_rate = 16 + random.randint(-4, 6)
            
            vital = VitalReading(
                patient_id=patient.id,
                timestamp=timestamp,
                heart_rate=heart_rate,
                spo2=spo2,
                temperature=temperature,
                blood_pressure_systolic=bp_systolic,
                blood_pressure_diastolic=bp_diastolic,
                respiratory_rate=respiratory_rate,
                source="SIMULATED_SENSOR",
                device_id=f"SIM-DEVICE-{patient.id:04d}",
            )
            db.add(vital)
        
        logger.info(f"Seeded 48 vital readings for patient {patient.id}")
    
    await db.commit()


async def run_seeder():
    """Run all seeders."""
    logger.info("Starting database seeder...")
    
    async with async_session() as db:
        try:
            # Seed users (doctors, caretakers, patients)
            users = await seed_users(db)
            
            # Seed medications
            await seed_medications(db)
            
            # Seed medication logs
            await seed_medication_logs(db)
            
            # Seed initial vitals
            await seed_initial_vitals(db)
            
            logger.info("Database seeding completed successfully!")
            
        except Exception as e:
            logger.error(f"Error during seeding: {e}")
            raise


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_seeder())
