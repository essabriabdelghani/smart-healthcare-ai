import uuid

from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer
from sqlalchemy.sql import func

from app.database import Base


class ClinicalNote(Base):
    __tablename__ = "clinical_notes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    patient_id = Column(
        String(36),
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False,
    )

    doctor_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    note = Column(Text, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())