import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, ForeignKey, ARRAY
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.base_class import Base


class ContractTemplate(Base):
    __tablename__ = "contract_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    template_type = Column(String(50), nullable=False, index=True)

    # Jurisdiction
    country = Column(String(100), nullable=False, index=True)
    language = Column(String(10), nullable=False, default="en")

    # Template Content
    content_template = Column(Text, nullable=False)

    # Variables Definition
    variables = Column(JSONB, nullable=False, default=[])

    # Version Control
    version = Column(Integer, default=1)
    parent_template_id = Column(UUID(as_uuid=True), ForeignKey("contract_templates.id", ondelete="SET NULL"))

    # Status
    is_active = Column(Boolean, default=True, index=True)
    requires_legal_review = Column(Boolean, default=True)

    # Metadata
    tags = Column(ARRAY(String))
    created_by = Column(UUID(as_uuid=True), ForeignKey("hr_employees.id", ondelete="SET NULL"))
    approved_by = Column(UUID(as_uuid=True), ForeignKey("hr_employees.id", ondelete="SET NULL"))
    approved_at = Column(DateTime(timezone=True))

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime(timezone=True))
