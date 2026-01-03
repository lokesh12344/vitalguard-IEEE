import logging
from typing import Dict, Set
import socketio
from app.config import settings

logger = logging.getLogger(__name__)

# Create Socket.IO server with async support
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True
)


class SocketManager:
    """Manager for Socket.IO connections and events."""
    
    def __init__(self):
        self.sio = sio
        self.patient_rooms: Dict[int, Set[str]] = {}  # patient_id -> set of socket IDs
    
    async def connect(self, sid: str, environ: dict):
        """Handle new connection."""
        logger.info(f"Client connected: {sid}")
    
    async def disconnect(self, sid: str):
        """Handle disconnection."""
        logger.info(f"Client disconnected: {sid}")
        # Remove from all patient rooms
        for patient_id in list(self.patient_rooms.keys()):
            if sid in self.patient_rooms[patient_id]:
                self.patient_rooms[patient_id].discard(sid)
    
    async def subscribe_to_patient(self, sid: str, patient_id: int):
        """Subscribe a client to a patient's vital updates."""
        room = f"patient:{patient_id}"
        await self.sio.enter_room(sid, room)
        
        if patient_id not in self.patient_rooms:
            self.patient_rooms[patient_id] = set()
        self.patient_rooms[patient_id].add(sid)
        
        logger.info(f"Client {sid} subscribed to patient {patient_id}")
    
    async def unsubscribe_from_patient(self, sid: str, patient_id: int):
        """Unsubscribe a client from a patient's updates."""
        room = f"patient:{patient_id}"
        await self.sio.leave_room(sid, room)
        
        if patient_id in self.patient_rooms:
            self.patient_rooms[patient_id].discard(sid)
        
        logger.info(f"Client {sid} unsubscribed from patient {patient_id}")
    
    async def emit_vital_update(self, patient_id: int, vital_data: dict):
        """Emit vital update to all subscribers of a patient."""
        room = f"patient:{patient_id}"
        await self.sio.emit("vital:update", vital_data, room=room)
        logger.debug(f"Emitted vital update for patient {patient_id}")
    
    async def emit_alert(self, patient_id: int, alert_data: dict):
        """Emit alert to all subscribers of a patient."""
        room = f"patient:{patient_id}"
        await self.sio.emit("alert:new", alert_data, room=room)
        
        # Also emit to global alerts room for doctor dashboard
        await self.sio.emit("alert:new", alert_data, room="alerts:all")
        logger.info(f"Emitted alert for patient {patient_id}")
    
    async def emit_high_risk_alert(self, patient_id: int, patient_name: str, alert_data: dict):
        """Emit high risk patient alert to all doctors."""
        high_risk_data = {
            **alert_data,
            "patient_id": patient_id,
            "patient_name": patient_name,
            "is_high_risk": True,
            "priority": "urgent"
        }
        await self.sio.emit("alert:high_risk", high_risk_data, room="alerts:all")
        logger.warning(f"🚨 HIGH RISK ALERT: Patient {patient_name} (ID: {patient_id})")
    
    async def emit_medication_reminder(self, patient_id: int, medication_data: dict):
        """Emit medication reminder."""
        room = f"patient:{patient_id}"
        await self.sio.emit("medication:reminder", medication_data, room=room)
    
    async def emit_alert_acknowledged(self, alert_id: int, acknowledged_by: str):
        """Emit alert acknowledgment notification."""
        await self.sio.emit(
            "alert:acknowledged",
            {"alert_id": alert_id, "acknowledged_by": acknowledged_by},
            room="alerts:all"
        )
    
    async def emit_chat_message(self, user_id: int, message_data: dict):
        """Emit chat message to a specific user."""
        room = f"user:{user_id}"
        await self.sio.emit("chat:message", message_data, room=room)
        logger.info(f"📩 Chat message sent to user {user_id}")
    
    async def emit_chat_read(self, sender_id: int, reader_id: int):
        """Notify sender that their messages were read."""
        room = f"user:{sender_id}"
        await self.sio.emit("chat:read", {
            "reader_id": reader_id,
            "sender_id": sender_id
        }, room=room)
    
    async def emit_chat_typing(self, receiver_id: int, sender_id: int, sender_name: str):
        """Notify that a user is typing."""
        room = f"user:{receiver_id}"
        await self.sio.emit("chat:typing", {
            "sender_id": sender_id,
            "sender_name": sender_name
        }, room=room)
    
    async def emit_chat_stop_typing(self, receiver_id: int, sender_id: int):
        """Notify that a user stopped typing."""
        room = f"user:{receiver_id}"
        await self.sio.emit("chat:stop_typing", {
            "sender_id": sender_id
        }, room=room)


# Create singleton instance
socket_manager = SocketManager()


# Register event handlers
@sio.event
async def connect(sid, environ):
    await socket_manager.connect(sid, environ)


@sio.event
async def disconnect(sid):
    await socket_manager.disconnect(sid)


@sio.event
async def subscribe_patient(sid, data):
    """Client subscribes to patient updates."""
    patient_id = data.get("patient_id")
    if patient_id:
        await socket_manager.subscribe_to_patient(sid, patient_id)
        return {"status": "subscribed", "patient_id": patient_id}


@sio.event
async def unsubscribe_patient(sid, data):
    """Client unsubscribes from patient updates."""
    patient_id = data.get("patient_id")
    if patient_id:
        await socket_manager.unsubscribe_from_patient(sid, patient_id)
        return {"status": "unsubscribed", "patient_id": patient_id}


@sio.event
async def subscribe_alerts(sid, data):
    """Subscribe to all alerts (for doctors)."""
    await sio.enter_room(sid, "alerts:all")
    logger.info(f"Client {sid} subscribed to all alerts")
    return {"status": "subscribed", "room": "alerts:all"}


@sio.event
async def subscribe_chat(sid, data):
    """Subscribe to personal chat room for receiving messages."""
    user_id = data.get("user_id")
    if user_id:
        room = f"user:{user_id}"
        await sio.enter_room(sid, room)
        logger.info(f"Client {sid} subscribed to chat room {room}")
        return {"status": "subscribed", "room": room}


@sio.event
async def unsubscribe_chat(sid, data):
    """Unsubscribe from personal chat room."""
    user_id = data.get("user_id")
    if user_id:
        room = f"user:{user_id}"
        await sio.leave_room(sid, room)
        logger.info(f"Client {sid} unsubscribed from chat room {room}")
        return {"status": "unsubscribed", "room": room}


@sio.event
async def typing(sid, data):
    """Handle typing indicator."""
    receiver_id = data.get("receiver_id")
    sender_id = data.get("sender_id")
    sender_name = data.get("sender_name", "Someone")
    if receiver_id:
        await socket_manager.emit_chat_typing(receiver_id, sender_id, sender_name)


@sio.event
async def stop_typing(sid, data):
    """Handle stop typing indicator."""
    receiver_id = data.get("receiver_id")
    sender_id = data.get("sender_id")
    if receiver_id:
        await socket_manager.emit_chat_stop_typing(receiver_id, sender_id)
