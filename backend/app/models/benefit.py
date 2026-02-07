import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Date, Numeric, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.base_class import Base


class Benefit(Base):
    __tablename__ = "benefits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    new_hire_id = Column(UUID(as_uuid=True), ForeignKey("new_hires.id", ondelete="CASCADE"), index=True)

    benefit_type = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=False)
    value = Column(Numeric(12, 2))
    currency = Column(String(3), default="USD")

    # Coverage Details
    coverage_start_date = Column(Date)
    coverage_details = Column(JSONB, default={})

    # Provider Info
    provider_name = Column(String(255))
    provider_contact = Column(Text)

    # Metadata
    meta_data = Column(JSONB, default={})
    is_active = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime(timezone=True))

    # Relationships
    new_hire = relationship("NewHire", back_populates="benefits")
