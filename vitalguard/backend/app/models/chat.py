"""
Chat Message Model for real-time messaging between users
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class MessageStatus(str, enum.Enum):
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"


class ChatMessage(Base):
    """Model for chat messages between users"""
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(20), default=MessageStatus.SENT.value)
    created_at = Column(DateTime, default=datetime.utcnow)
    read_at = Column(DateTime, nullable=True)
    
    # Relationships
    sender = relationship("User", foreign_keys=[sender_id], backref="sent_messages")
    receiver = relationship("User", foreign_keys=[receiver_id], backref="received_messages")

    def to_dict(self):
        return {
            "id": self.id,
            "sender_id": self.sender_id,
            "receiver_id": self.receiver_id,
            "sender_name": self.sender.full_name if self.sender else "Unknown",
            "receiver_name": self.receiver.full_name if self.receiver else "Unknown",
            "sender_role": self.sender.role.value if self.sender else "unknown",
            "receiver_role": self.receiver.role.value if self.receiver else "unknown",
            "message": self.message,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "read_at": self.read_at.isoformat() if self.read_at else None,
        }


class ChatRoom(Base):
    """Model for chat rooms/conversations between users"""
    __tablename__ = "chat_rooms"

    id = Column(Integer, primary_key=True, index=True)
    participant1_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    participant2_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    last_message_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    participant1 = relationship("User", foreign_keys=[participant1_id])
    participant2 = relationship("User", foreign_keys=[participant2_id])

    def to_dict(self):
        return {
            "id": self.id,
            "participant1_id": self.participant1_id,
            "participant2_id": self.participant2_id,
            "participant1_name": self.participant1.full_name if self.participant1 else "Unknown",
            "participant2_name": self.participant2.full_name if self.participant2 else "Unknown",
            "participant1_role": self.participant1.role.value if self.participant1 else "unknown",
            "participant2_role": self.participant2.role.value if self.participant2 else "unknown",
            "last_message_at": self.last_message_at.isoformat() if self.last_message_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
