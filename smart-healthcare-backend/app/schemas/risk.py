from datetime import datetime
from pydantic import BaseModel, ConfigDict
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
    created_at: datetime