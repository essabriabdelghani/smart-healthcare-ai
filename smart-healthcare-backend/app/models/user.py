import enum

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Enum,
    Boolean,
    ForeignKey,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class UserRole(str, enum.Enum):
    patient = "patient"
    doctor = "doctor"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
        index=True,
    )

    full_name = Column(
        String(150),
        nullable=False,
    )

    email = Column(
        String(150),
        unique=True,
        nullable=False,
        index=True,
    )

    password_hash = Column(
        String(255),
        nullable=False,
    )

    role = Column(
        Enum(UserRole),
        nullable=False,
        default=UserRole.patient,
    )

    # Chaque compte (patient, médecin ou admin) appartient à une clinique.
    # C'est la clé de partitionnement qui empêche un médecin de voir les
    # patients d'une autre clinique.
    clinic_id = Column(
        String(36),
        ForeignKey("clinics.id", ondelete="RESTRICT"),
        nullable=False,
    )

    phone = Column(
        String(20),
        nullable=True,
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    clinic = relationship("Clinic")

    @property
    def clinic_name(self) -> str | None:
        return self.clinic.name if self.clinic else None