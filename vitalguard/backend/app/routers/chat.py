"""
Chat API Router for real-time messaging between users
"""

from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, desc, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.chat import ChatMessage, ChatRoom, MessageStatus
from app.socket_manager import socket_manager

router = APIRouter(prefix="/chat", tags=["Chat"])


# Request/Response Models
class SendMessageRequest(BaseModel):
    sender_id: int
    receiver_id: int
    message: str


class MessageResponse(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    sender_name: str
    receiver_name: str
    sender_role: str
    receiver_role: str
    message: str
    status: str
    created_at: Optional[str] = None
    read_at: Optional[str] = None


# Helper function to get or create chat room
async def get_or_create_chat_room(db: AsyncSession, user1_id: int, user2_id: int) -> ChatRoom:
    """Get existing chat room or create a new one"""
    # Ensure consistent ordering
    p1_id, p2_id = min(user1_id, user2_id), max(user1_id, user2_id)
    
    result = await db.execute(
        select(ChatRoom).where(
            ChatRoom.participant1_id == p1_id,
            ChatRoom.participant2_id == p2_id
        )
    )
    room = result.scalar_one_or_none()
    
    if not room:
        room = ChatRoom(
            participant1_id=p1_id,
            participant2_id=p2_id
        )
        db.add(room)
        await db.flush()
    
    return room


@router.get("/conversations/{user_id}")
async def get_conversations(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get all conversations for a user"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get all chat rooms where user is a participant
    result = await db.execute(
        select(ChatRoom)
        .options(
            selectinload(ChatRoom.participant1),
            selectinload(ChatRoom.participant2)
        )
        .where(
            or_(
                ChatRoom.participant1_id == user_id,
                ChatRoom.participant2_id == user_id
            )
        )
        .order_by(desc(ChatRoom.last_message_at))
    )
    rooms = result.scalars().all()
    
    conversations = []
    for room in rooms:
        # Get the other participant
        other_user = room.participant2 if room.participant1_id == user_id else room.participant1
        
        # Get last message
        msg_result = await db.execute(
            select(ChatMessage)
            .where(
                or_(
                    and_(ChatMessage.sender_id == user_id, ChatMessage.receiver_id == other_user.id),
                    and_(ChatMessage.sender_id == other_user.id, ChatMessage.receiver_id == user_id)
                )
            )
            .order_by(desc(ChatMessage.created_at))
            .limit(1)
        )
        last_message = msg_result.scalar_one_or_none()
        
        # Count unread messages
        unread_result = await db.execute(
            select(func.count(ChatMessage.id))
            .where(
                ChatMessage.sender_id == other_user.id,
                ChatMessage.receiver_id == user_id,
                ChatMessage.status != MessageStatus.READ.value
            )
        )
        unread_count = unread_result.scalar() or 0
        
        conversations.append({
            "user_id": other_user.id,
            "user_name": other_user.full_name,
            "user_role": other_user.role.value if other_user.role else "unknown",
            "last_message": last_message.message[:50] + "..." if last_message and len(last_message.message) > 50 else (last_message.message if last_message else None),
            "last_message_at": last_message.created_at.isoformat() if last_message else None,
            "unread_count": unread_count
        })
    
    return conversations


@router.get("/messages/{user_id}/{other_user_id}")
async def get_messages(
    user_id: int,
    other_user_id: int,
    limit: int = Query(50, le=100),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db)
):
    """Get messages between two users"""
    result = await db.execute(
        select(ChatMessage)
        .options(
            selectinload(ChatMessage.sender),
            selectinload(ChatMessage.receiver)
        )
        .where(
            or_(
                and_(ChatMessage.sender_id == user_id, ChatMessage.receiver_id == other_user_id),
                and_(ChatMessage.sender_id == other_user_id, ChatMessage.receiver_id == user_id)
            )
        )
        .order_by(desc(ChatMessage.created_at))
        .offset(offset)
        .limit(limit)
    )
    messages = result.scalars().all()
    
    # Mark messages as read
    await db.execute(
        select(ChatMessage)
        .where(
            ChatMessage.sender_id == other_user_id,
            ChatMessage.receiver_id == user_id,
            ChatMessage.status != MessageStatus.READ.value
        )
    )
    
    # Update status to read
    from sqlalchemy import update
    await db.execute(
        update(ChatMessage)
        .where(
            ChatMessage.sender_id == other_user_id,
            ChatMessage.receiver_id == user_id,
            ChatMessage.status != MessageStatus.READ.value
        )
        .values(status=MessageStatus.READ.value, read_at=datetime.utcnow())
    )
    await db.commit()
    
    # Reverse to get chronological order
    messages = list(reversed(messages))
    
    return [msg.to_dict() for msg in messages]


@router.post("/send")
async def send_message(
    request: SendMessageRequest,
    db: AsyncSession = Depends(get_db)
):
    """Send a message to another user"""
    # Validate users exist
    sender_result = await db.execute(select(User).where(User.id == request.sender_id))
    sender = sender_result.scalar_one_or_none()
    
    receiver_result = await db.execute(select(User).where(User.id == request.receiver_id))
    receiver = receiver_result.scalar_one_or_none()
    
    if not sender:
        raise HTTPException(status_code=404, detail="Sender not found")
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")
    
    # Create or get chat room
    await get_or_create_chat_room(db, request.sender_id, request.receiver_id)
    
    # Create message
    message = ChatMessage(
        sender_id=request.sender_id,
        receiver_id=request.receiver_id,
        message=request.message,
        status=MessageStatus.SENT.value
    )
    db.add(message)
    
    # Update chat room last_message_at
    p1_id, p2_id = min(request.sender_id, request.receiver_id), max(request.sender_id, request.receiver_id)
    from sqlalchemy import update
    await db.execute(
        update(ChatRoom)
        .where(
            ChatRoom.participant1_id == p1_id,
            ChatRoom.participant2_id == p2_id
        )
        .values(last_message_at=datetime.utcnow())
    )
    
    await db.commit()
    await db.refresh(message)
    
    # Load relationships for response
    result = await db.execute(
        select(ChatMessage)
        .options(
            selectinload(ChatMessage.sender),
            selectinload(ChatMessage.receiver)
        )
        .where(ChatMessage.id == message.id)
    )
    message = result.scalar_one()
    
    message_data = message.to_dict()
    
    # Emit WebSocket event to receiver and sender
    await socket_manager.emit_chat_message(request.receiver_id, message_data)
    await socket_manager.emit_chat_message(request.sender_id, message_data)
    
    return message_data


@router.post("/mark-read/{user_id}/{other_user_id}")
async def mark_messages_read(
    user_id: int,
    other_user_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Mark all messages from other_user as read"""
    from sqlalchemy import update
    
    result = await db.execute(
        update(ChatMessage)
        .where(
            ChatMessage.sender_id == other_user_id,
            ChatMessage.receiver_id == user_id,
            ChatMessage.status != MessageStatus.READ.value
        )
        .values(status=MessageStatus.READ.value, read_at=datetime.utcnow())
    )
    await db.commit()
    
    # Notify the sender that messages were read
    await socket_manager.emit_chat_read(other_user_id, user_id)
    
    return {"marked_read": result.rowcount}


@router.get("/contacts/{user_id}")
async def get_contacts(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get available contacts for a user based on their role and relationships"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    contacts = []
    
    if user.role == UserRole.PATIENT:
        # Patients can message their doctor and caretaker
        patient_result = await db.execute(
            select(Patient)
            .options(
                selectinload(Patient.primary_doctor),
                selectinload(Patient.caregiver)
            )
            .where(Patient.user_id == user_id)
        )
        patient = patient_result.scalar_one_or_none()
        
        if patient:
            # Add doctor
            if patient.primary_doctor_id:
                doc_result = await db.execute(
                    select(User).where(User.id == patient.primary_doctor_id)
                )
                doctor = doc_result.scalar_one_or_none()
                if doctor:
                    contacts.append({
                        "id": doctor.id,
                        "name": doctor.full_name,
                        "role": "doctor"
                    })
            
            # Add caretaker
            if patient.caregiver_id:
                care_result = await db.execute(
                    select(User).where(User.id == patient.caregiver_id)
                )
                caretaker = care_result.scalar_one_or_none()
                if caretaker:
                    contacts.append({
                        "id": caretaker.id,
                        "name": caretaker.full_name,
                        "role": "caretaker"
                    })
    
    elif user.role == UserRole.DOCTOR:
        # Doctors can message their patients and patients' caretakers
        patients_result = await db.execute(
            select(Patient)
            .options(selectinload(Patient.user))
            .where(Patient.primary_doctor_id == user_id)
        )
        patients = patients_result.scalars().all()
        
        added_ids = set()
        for patient in patients:
            if patient.user and patient.user.id not in added_ids:
                contacts.append({
                    "id": patient.user.id,
                    "name": patient.user.full_name,
                    "role": "patient",
                    "condition": patient.condition_summary
                })
                added_ids.add(patient.user.id)
            
            # Add caretaker
            if patient.caregiver_id and patient.caregiver_id not in added_ids:
                care_result = await db.execute(
                    select(User).where(User.id == patient.caregiver_id)
                )
                caretaker = care_result.scalar_one_or_none()
                if caretaker:
                    contacts.append({
                        "id": caretaker.id,
                        "name": caretaker.full_name,
                        "role": "caretaker"
                    })
                    added_ids.add(caretaker.id)
    
    elif user.role == UserRole.CAREGIVER:
        # Caretakers can message their patients and patients' doctors
        patients_result = await db.execute(
            select(Patient)
            .options(selectinload(Patient.user))
            .where(Patient.caregiver_id == user_id)
        )
        patients = patients_result.scalars().all()
        
        added_ids = set()
        for patient in patients:
            if patient.user and patient.user.id not in added_ids:
                contacts.append({
                    "id": patient.user.id,
                    "name": patient.user.full_name,
                    "role": "patient",
                    "condition": patient.condition_summary
                })
                added_ids.add(patient.user.id)
            
            # Add doctor
            if patient.primary_doctor_id and patient.primary_doctor_id not in added_ids:
                doc_result = await db.execute(
                    select(User).where(User.id == patient.primary_doctor_id)
                )
                doctor = doc_result.scalar_one_or_none()
                if doctor:
                    contacts.append({
                        "id": doctor.id,
                        "name": doctor.full_name,
                        "role": "doctor"
                    })
                    added_ids.add(doctor.id)
    
    return contacts


@router.get("/unread-count/{user_id}")
async def get_unread_count(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get total unread message count for a user"""
    result = await db.execute(
        select(func.count(ChatMessage.id))
        .where(
            ChatMessage.receiver_id == user_id,
            ChatMessage.status != MessageStatus.READ.value
        )
    )
    count = result.scalar() or 0
    
    return {"unread_count": count}
