from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator
from app.models.risk_assessment import RiskLevel


class RiskAssessmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    intake_id: str
    risk_score: float
    risk_level: RiskLevel
    explanation: str
    ai_confidence: float
    reviewed_by: int | None
    reviewed_at: datetime | None
    override_score: float | None
    override_level: RiskLevel | None
    override_note: str | None
    created_at: datetime


class RiskReviewCreate(BaseModel):
    """Le médecin confirme le score IA tel quel (tous les champs à None),
    ou l'ajuste (au moins override_score ou override_level renseigné)."""

    override_score: float | None = None
    override_level: RiskLevel | None = None
    note: str = ""

    @field_validator("override_score")
    @classmethod
    def score_range(cls, v: float | None) -> float | None:
        if v is not None and not (0 <= v <= 100):
            raise ValueError("Le score doit être compris entre 0 et 100")
        return v


class AuditLogEntry(BaseModel):
    intake_id: str
    patient_name: str
    doctor_name: str | None
    ai_score: float
    ai_level: RiskLevel
    override_score: float | None
    override_level: RiskLevel | None
    was_modified: bool
    reviewed_at: datetime