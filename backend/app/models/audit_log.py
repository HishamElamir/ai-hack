import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.base_class import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # What was changed
    entity_type = Column(String(100), nullable=False, index=True)
    entity_id = Column(UUID(as_uuid=True), nullable=False)
    action = Column(String(50), nullable=False, index=True)

    # Who made the change
    user_id = Column(UUID(as_uuid=True))
    user_type = Column(String(50))

    # What changed
    changes = Column(JSONB)

    # Request metadata
    ip_address = Column(String(45))
    user_agent = Column(Text)
    request_id = Column(String(255))

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
