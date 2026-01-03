import logging
import asyncio
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
from app.database import init_db, close_db
from app.socket_manager import sio
from app.routers import auth, patients, vitals, medications, alerts
from app.routers.public import router as public_router
from app.routers.chat import router as chat_router
from app.services.simulator import vital_simulator
from app.services.seeder import run_seeder
# Import models to ensure they're registered with Base metadata
from app.models import User, Patient, VitalReading, Medication, MedicationLog, Alert, ChatMessage, ChatRoom

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown events."""
    # Startup
    logger.info("Starting VitalGuard API...")
    await init_db()
    logger.info("Database initialized")
    
    # Run seeder to populate initial data
    try:
        logger.info("Running database seeder...")
        await run_seeder()
        logger.info("Database seeded successfully")
    except Exception as e:
        logger.error(f"Seeder error (may be already seeded): {e}")
    
    # Start vital simulator in background
    if os.environ.get("ENABLE_SIMULATOR", "true").lower() == "true":
        logger.info("Starting vital signs simulator...")
        vital_simulator.run_in_background()
    
    yield
    
    # Shutdown
    logger.info("Shutting down VitalGuard API...")
    await vital_simulator.stop()
    await close_db()
    logger.info("Database connections closed")


# Create FastAPI app
app = FastAPI(
    title="VitalGuard API",
    description="Smart Remote Monitoring API for Home-Based Patient Care",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware - must be added BEFORE Socket.IO wrapping
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(patients.router, prefix="/api")
app.include_router(vitals.router, prefix="/api")
app.include_router(medications.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")
app.include_router(public_router, prefix="/api")
app.include_router(chat_router, prefix="/api/public")


# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "vitalguard-api"}


@app.get("/")
async def root():
    return {
        "message": "Welcome to VitalGuard API",
        "docs": "/docs",
        "health": "/health"
    }


# Mount Socket.IO with CORS support
socket_app = socketio.ASGIApp(
    sio, 
    other_asgi_app=app,
    socketio_path="/socket.io"
)

# For running with uvicorn directly
app = socket_app
