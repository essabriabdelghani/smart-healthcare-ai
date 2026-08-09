import uuid

from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    DECIMAL,
    Text,
)
from sqlalchemy.sql import func

from app.database import Base


class ExtractedEntity(Base):
    __tablename__ = "extracted_entities"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    intake_id = Column(
        String,
        ForeignKey("patient_intakes.id", ondelete="CASCADE"),
        nullable=False,
    )

    entity_type = Column(String(50), nullable=False)

    entity_value = Column(Text, nullable=False)

    confidence = Column(DECIMAL(5,2))

    created_at = Column(DateTime(timezone=True), server_default=func.now())