import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Numeric, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.base_class import Base


class ConversationMessage(Base):
    __tablename__ = "conversation_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), index=True)

    # Message Content
    speaker = Column(String(50), nullable=False, index=True)
    message = Column(Text, nullable=False)

    # Audio
    audio_url = Column(Text)
    audio_duration_seconds = Column(Numeric(6, 2))

    # Translation
    original_language = Column(String(10))
    translated_message = Column(Text)

    # Metadata
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    message_metadata = Column(JSONB, default={})

    # Sequence
    sequence_number = Column(Integer, nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
