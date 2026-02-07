import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.base_class import Base


class Question(Base):
    __tablename__ = "questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    new_hire_id = Column(UUID(as_uuid=True), ForeignKey("new_hires.id", ondelete="CASCADE"), index=True)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="SET NULL"))

    # Question Content
    question = Column(Text, nullable=False)
    context = Column(Text)
    category = Column(String(100))

    # Status
    status = Column(String(50), default="pending", index=True)
    priority = Column(String(20), default="normal", index=True)

    # Response
    hr_response = Column(Text)
    responded_by = Column(UUID(as_uuid=True), ForeignKey("hr_employees.id", ondelete="SET NULL"))
    answered_at = Column(DateTime(timezone=True))

    # Timing
    asked_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    response_due_by = Column(DateTime(timezone=True))

    # Metadata
    meta_data = Column(JSONB, default={})
    sentiment = Column(String(20))

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime(timezone=True))

    # Relationships
    new_hire = relationship("NewHire", back_populates="questions")
    responded_by_employee = relationship("HREmployee", back_populates="answered_questions", foreign_keys=[responded_by])
    conversation = relationship("Conversation")
