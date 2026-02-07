import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.base_class import Base


class Contract(Base):
    __tablename__ = "contracts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    new_hire_id = Column(UUID(as_uuid=True), ForeignKey("new_hires.id", ondelete="CASCADE"))
    template_id = Column(UUID(as_uuid=True), ForeignKey("contract_templates.id", ondelete="SET NULL"))

    contract_type = Column(String(50), nullable=False, index=True)

    # Content
    content = Column(Text)
    s3_url = Column(Text)
    s3_bucket = Column(String(255))
    s3_key = Column(String(500))

    # Version Control
    version = Column(Integer, default=1)
    parent_contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id", ondelete="SET NULL"))

    # Status
    status = Column(String(50), default="draft", index=True)

    # Signature
    signed_at = Column(DateTime(timezone=True))
    signature_url = Column(Text)
    signature_ip = Column(String(45))

    # Generation Metadata
    generation_prompt = Column(Text)
    ai_model = Column(String(100))
    generation_tokens = Column(Integer)

    # Document Metadata
    meta_data = Column(JSONB, default={})
    variables = Column(JSONB, default={})

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime(timezone=True))

    # Relationships
    new_hire = relationship("NewHire", back_populates="contracts")
    template = relationship("ContractTemplate")
    parent_contract = relationship("Contract", remote_side=[id])
