from pydantic import BaseModel


class DashboardStatsOut(BaseModel):
    total_patients: int

    total_intakes: int

    total_assessments: int

    low_risk: int

    medium_risk: int

    high_risk: int

    critical_risk: int


class DoctorPatientRow(BaseModel):
    """Une ligne du dashboard médecin : une admission, avec l'identité du
    patient et son risque, en un seul aller-retour (évite le N+1 côté front)."""

    intake_id: str
    patient_id: str

    first_name: str
    last_name: str
    gender: str
    date_of_birth: str

    reason_for_visit: str
    symptoms_text: str
    created_at: str

    risk_score: int | None = None
    risk_level: str | None = None

    has_account: bool  # False = dossier "admission directe" (pas de compte patient)
    emergency_phone: str | None = None  # sert de clé de regroupement au dashboard médecin