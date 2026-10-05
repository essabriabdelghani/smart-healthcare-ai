from pydantic import BaseModel, field_validator


class AskRequest(BaseModel):
    question: str
    # Fourni par le frontend uniquement quand le widget est monté dans le
    # contexte d'un patient (ex. RiskResultPage). Son absence bascule
    # automatiquement en mode "general" (RAG).
    patient_id: str | None = None
    intake_id: str | None = None

    @field_validator("question")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Question cannot be empty")
        if len(v) > 2000:
            raise ValueError("Question is too long")
        return v.strip()


class SourceOut(BaseModel):
    source: str
    relevance: float


class AskResponse(BaseModel):
    mode: str  # "patient" | "general"
    answer: str
    sources: list[SourceOut] = []
    disclaimer: str
