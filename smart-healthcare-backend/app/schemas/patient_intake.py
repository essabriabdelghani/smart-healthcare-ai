from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, field_validator


class PatientIntakeCreate(BaseModel):
    # patient_id مشي هنا — الباكند كيresolvih من current_user

    reason_for_visit: str
    symptoms_text: str
    medical_history: str = ""
    current_medications: str = ""
    allergies: str = ""
    temperature: float | None = None
    blood_pressure: str | None = None
    heart_rate: int | None = None
    oxygen_saturation: float | None = None
    additional_notes: str = ""

    @field_validator("reason_for_visit", "symptoms_text")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("This field cannot be empty")
        return v.strip()

    @field_validator("temperature")
    @classmethod
    def temperature_range(cls, v: float | None) -> float | None:
        if v is not None and not (35 <= v <= 42):
            raise ValueError("Temperature must be between 35°C and 42°C")
        return v

    @field_validator("heart_rate")
    @classmethod
    def heart_rate_range(cls, v: int | None) -> int | None:
        if v is not None and not (20 <= v <= 250):
            raise ValueError("Heart rate must be between 20 and 250 bpm")
        return v

    @field_validator("oxygen_saturation")
    @classmethod
    def spo2_range(cls, v: float | None) -> float | None:
        if v is not None and not (0 <= v <= 100):
            raise ValueError("Oxygen saturation must be between 0 and 100%")
        return v


class StaffPatientIntakeCreate(BaseModel):
    """
    Utilisé par un médecin/admin pour créer un dossier "admission directe" :
    identité du patient + motif de visite en une seule requête, sans compte
    de connexion pour le patient.
    """

    # Identité
    first_name: str
    last_name: str
    gender: str = "unspecified"
    date_of_birth: date

    # Admission
    reason_for_visit: str
    symptoms_text: str
    medical_history: str = ""
    current_medications: str = ""
    allergies: str = ""
    temperature: float | None = None
    blood_pressure: str | None = None
    heart_rate: int | None = None
    oxygen_saturation: float | None = None
    additional_notes: str = ""

    @field_validator("first_name", "last_name", "reason_for_visit", "symptoms_text")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("This field cannot be empty")
        return v.strip()

    @field_validator("temperature")
    @classmethod
    def temperature_range(cls, v: float | None) -> float | None:
        if v is not None and not (35 <= v <= 42):
            raise ValueError("Temperature must be between 35°C and 42°C")
        return v

    @field_validator("heart_rate")
    @classmethod
    def heart_rate_range(cls, v: int | None) -> int | None:
        if v is not None and not (20 <= v <= 250):
            raise ValueError("Heart rate must be between 20 and 250 bpm")
        return v

    @field_validator("oxygen_saturation")
    @classmethod
    def spo2_range(cls, v: float | None) -> float | None:
        if v is not None and not (0 <= v <= 100):
            raise ValueError("Oxygen saturation must be between 0 and 100%")
        return v


class PatientIntakeUpdate(BaseModel):
    reason_for_visit: str | None = None
    symptoms_text: str | None = None
    medical_history: str | None = None
    current_medications: str | None = None
    allergies: str | None = None
    temperature: float | None = None
    blood_pressure: str | None = None
    heart_rate: int | None = None
    oxygen_saturation: float | None = None
    additional_notes: str | None = None


class PatientIntakeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    patient_id: str
    reason_for_visit: str
    symptoms_text: str
    medical_history: str
    current_medications: str
    allergies: str
    temperature: float | None
    blood_pressure: str | None
    heart_rate: int | None
    oxygen_saturation: float | None
    additional_notes: str
    status: str
    created_at: datetime


class ExtractedEntityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    intake_id: str
    entity_type: str
    entity_value: str
    confidence: float | None