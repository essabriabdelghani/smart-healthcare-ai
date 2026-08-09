import uuid

from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    ForeignKey,
    Integer,
    DECIMAL,
)
from sqlalchemy.sql import func

from app.database import Base


class PatientIntake(Base):
    __tablename__ = "patient_intakes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    patient_id = Column(
        String(36),
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False,
    )

    reason_for_visit = Column(Text, nullable=False)
    symptoms_text = Column(Text, nullable=False)
    medical_history = Column(Text)
    current_medications = Column(Text)
    allergies = Column(Text)
    temperature = Column(DECIMAL(4, 1))
    blood_pressure = Column(String(20))
    heart_rate = Column(Integer)
    oxygen_saturation = Column(DECIMAL(4, 1))
    additional_notes = Column(Text)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())