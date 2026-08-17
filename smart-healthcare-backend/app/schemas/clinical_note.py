from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


class ClinicalNoteCreate(BaseModel):
    note: str

    @field_validator("note")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Note cannot be empty")
        return v.strip()


class ClinicalNoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    patient_id: str
    doctor_id: int | None
    doctor_name: str | None = None
    note: str
    created_at: datetime