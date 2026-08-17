from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


class AppointmentCreate(BaseModel):
    patient_id: str
    doctor_id: int
    appointment_date: datetime
    notes: str = ""  # motif de la visite

    @field_validator("notes")
    @classmethod
    def clean_notes(cls, v: str) -> str:
        return v.strip()


class AppointmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    patient_id: str
    patient_name: str
    doctor_id: int | None
    doctor_name: str | None
    appointment_date: datetime
    status: str
    notes: str | None

    # Dernier niveau de risque connu pour ce patient (dernière admission
    # évaluée) — utilisé côté frontend pour la bordure colorée de priorité.
    # None si le patient n'a encore aucune admission évaluée.
    last_risk_level: str | None = None


class DoctorOption(BaseModel):
    id: int
    full_name: str