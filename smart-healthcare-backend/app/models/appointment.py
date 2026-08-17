import uuid

from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer

from app.database import Base


class Appointment(Base):
    __tablename__ = "appointments"

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

    appointment_date = Column(DateTime(timezone=True), nullable=False)

    status = Column(String(30), nullable=False, default="scheduled")

    notes = Column(Text, nullable=True)  # sert de "motif" dans le formulaire