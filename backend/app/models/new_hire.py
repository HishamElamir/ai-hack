import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Date, Numeric, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.base_class import Base


class NewHire(Base):
    __tablename__ = "new_hires"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hr_employee_id = Column(UUID(as_uuid=True), ForeignKey("hr_employees.id", ondelete="SET NULL"))

    # Personal Information
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(50))
    preferred_language = Column(String(10), default="en")

    # Employment Details
    position = Column(String(255), nullable=False)
    department = Column(String(100), nullable=False)
    salary = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="USD")
    start_date = Column(Date, nullable=False)
    employment_type = Column(String(50), default="full_time")

    # Location
    country = Column(String(100), nullable=False)
    city = Column(String(100))
    work_location = Column(String(100))

    # Status Tracking
    status = Column(String(50), default="draft", index=True)

    # Progress Tracking
    voice_session_completed = Column(Boolean, default=False)
    voice_session_started_at = Column(DateTime(timezone=True))
    voice_session_completed_at = Column(DateTime(timezone=True))
    offer_accepted = Column(Boolean, default=False)
    offer_accepted_at = Column(DateTime(timezone=True))

    # Session Management
    session_id = Column(String(255), unique=True, index=True)
    session_expires_at = Column(DateTime(timezone=True))
    invitation_sent_at = Column(DateTime(timezone=True))

    # Additional Data
    meta_data = Column(JSONB, default={})
    notes = Column(Text)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime(timezone=True))

    # Relationships
    hr_employee = relationship("HREmployee", back_populates="new_hires")
    contracts = relationship("Contract", back_populates="new_hire", cascade="all, delete-orphan")
    benefits = relationship("Benefit", back_populates="new_hire", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="new_hire", cascade="all, delete-orphan")
    questions = relationship("Question", back_populates="new_hire", cascade="all, delete-orphan")
