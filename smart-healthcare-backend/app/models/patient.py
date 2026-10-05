import uuid

from sqlalchemy import Column, String, Date, DateTime, DECIMAL, ForeignKey
from sqlalchemy.dialects.mysql import BIGINT
from sqlalchemy.sql import func

from app.database import Base


class Patient(Base):
    __tablename__ = "patients"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    
    user_id = Column(
        BIGINT(unsigned=True),               
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=True,
    )

    
    created_by = Column(
        BIGINT(unsigned=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Même clinique que le compte créateur — c'est CE champ qui isole les
    # patients d'une clinique par rapport aux autres dans le dashboard médecin.
    clinic_id = Column(
        String(36),
        ForeignKey("clinics.id", ondelete="RESTRICT"),
        nullable=False,
    )

    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    gender = Column(String(20), nullable=False)
    date_of_birth = Column(Date, nullable=False)
    blood_group = Column(String(5))
    height = Column(DECIMAL(5, 2))
    weight = Column(DECIMAL(5, 2))
    emergency_contact = Column(String(150))
    emergency_phone = Column(String(20))
    created_at = Column(DateTime(timezone=True), server_default=func.now())