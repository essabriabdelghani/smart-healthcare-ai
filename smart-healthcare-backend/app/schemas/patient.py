from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class PatientCreate(BaseModel):
    first_name: str
    last_name: str
    gender: str
    date_of_birth: date

    blood_group: str | None = None
    height: float | None = None
    weight: float | None = None

    emergency_contact: str | None = None
    emergency_phone: str | None = None


class PatientUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    gender: str | None = None
    date_of_birth: date | None = None

    blood_group: str | None = None
    height: float | None = None
    weight: float | None = None

    emergency_contact: str | None = None
    emergency_phone: str | None = None


class PatientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: int | None
    created_by: int | None

    first_name: str
    last_name: str
    gender: str

    date_of_birth: date

    blood_group: str | None
    height: float | None
    weight: float | None

    emergency_contact: str | None
    emergency_phone: str | None

    created_at: datetime