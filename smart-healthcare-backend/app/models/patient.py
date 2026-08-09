import uuid

from sqlalchemy import Column, String, Date, DateTime, DECIMAL, ForeignKey
from sqlalchemy.dialects.mysql import BIGINT
from sqlalchemy.sql import func

from app.database import Base


class Patient(Base):
    __tablename__ = "patients"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    # Nullable : un dossier créé directement par un médecin/admin (admission
    # "walk-in") n'a pas de compte utilisateur associé. Les patients qui
    # s'inscrivent eux-mêmes ont bien un user_id.
    user_id = Column(
        BIGINT(unsigned=True),               # ← مطابق بالضبط لـ users.id (bigint(20) unsigned)
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=True,
    )

    # Qui a créé ce dossier : le patient lui-même (auto-inscription) ou un
    # médecin/admin (admission directe). Toujours renseigné, utile pour l'audit.
    created_by = Column(
        BIGINT(unsigned=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
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