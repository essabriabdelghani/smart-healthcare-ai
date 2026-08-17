import enum
import uuid

from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    Enum,
    DECIMAL,
    ForeignKey,
)
from sqlalchemy.dialects.mysql import BIGINT
from sqlalchemy.sql import func

from app.database import Base


class RiskLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    intake_id = Column(
        String(36),
        ForeignKey("patient_intakes.id", ondelete="CASCADE"),
        nullable=False,
    )

    risk_score = Column(DECIMAL(5, 2))

    risk_level = Column(Enum(RiskLevel))

    explanation = Column(Text)

    ai_confidence = Column(DECIMAL(5, 2))

    reviewed_by = Column(
        BIGINT(unsigned=True),        # ← بدلنا من String لـ BIGINT(unsigned=True)
        ForeignKey("users.id"),
        nullable=True,
    )

    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    # Renseignés uniquement si le médecin AJUSTE le score IA (sinon il l'a
    # simplement confirmé tel quel — reviewed_by/reviewed_at suffisent).
    override_score = Column(DECIMAL(5, 2), nullable=True)
    override_level = Column(Enum(RiskLevel), nullable=True)
    override_note = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())