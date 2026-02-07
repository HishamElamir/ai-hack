import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Numeric, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.base_class import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    new_hire_id = Column(UUID(as_uuid=True), ForeignKey("new_hires.id", ondelete="CASCADE"), index=True)

    session_id = Column(String(255), unique=True, nullable=False, index=True)

    # Conversation Metadata
    language = Column(String(10), default="en")
    platform = Column(String(50), default="elevenlabs")

    # Timing
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True))
    duration_seconds = Column(Integer)

    # Content
    full_transcript = Column(Text)
    summary = Column(Text)

    # Quality Metrics
    sentiment_score = Column(Numeric(3, 2))
    engagement_score = Column(Numeric(3, 2))
    completion_status = Column(String(50))

    # Technical Metadata
    agent_id = Column(String(255))
    elevenlabs_conversation_id = Column(String(255), index=True)
    conversation_metadata = Column(JSONB, default={})

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    new_hire = relationship("NewHire", back_populates="conversations")
    messages = relationship("ConversationMessage", back_populates="conversation", cascade="all, delete-orphan")
