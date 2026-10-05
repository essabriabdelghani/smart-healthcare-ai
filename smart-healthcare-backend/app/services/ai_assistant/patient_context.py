"""
Construit le contexte clinique structuré d'un patient (dernière admission,
ou admission précisée) pour l'Assistant IA : symptômes, antécédents,
constantes vitales, entités NLP extraites (avec négation) et évaluation de
risque déjà calculée.

Ce contexte est injecté tel quel dans le prompt de Qwen — l'assistant ne
répond QUE sur cette base pour un patient donné. Aucun appel au moteur NLP
ni au Risk Engine n'est refait ici : on réutilise les résultats déjà
persistés par le pipeline d'admission (extracted_entities, risk_assessments),
ce qui garantit que l'explication donnée au médecin correspond exactement
au score affiché dans le dashboard, sans divergence possible.
"""
from sqlalchemy.orm import Session

from app.models.patient import Patient
from app.models.patient_intake import PatientIntake
from app.models.extracted_entity import ExtractedEntity
from app.models.risk_assessment import RiskAssessment


def build_patient_context(db: Session, patient_id: str, intake_id: str | None = None) -> dict:
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if patient is None:
        raise ValueError("Patient not found")

    query = db.query(PatientIntake).filter(PatientIntake.patient_id == patient_id)
    intake = (
        query.filter(PatientIntake.id == intake_id).first()
        if intake_id
        else query.order_by(PatientIntake.created_at.desc()).first()
    )

    if intake is None:
        return {"patient": _patient_summary(patient), "intake": None, "entities": [], "risk": None}

    entities = (
        db.query(ExtractedEntity)
        .filter(ExtractedEntity.intake_id == intake.id)
        .all()
    )
    risk = (
        db.query(RiskAssessment)
        .filter(RiskAssessment.intake_id == intake.id)
        .order_by(RiskAssessment.created_at.desc())
        .first()
    )

    return {
        "patient": _patient_summary(patient),
        "intake": {
            "reason_for_visit": intake.reason_for_visit,
            "symptoms_text": intake.symptoms_text,
            "medical_history": intake.medical_history,
            "current_medications": intake.current_medications,
            "allergies": intake.allergies,
            "temperature": float(intake.temperature) if intake.temperature is not None else None,
            "blood_pressure": intake.blood_pressure,
            "heart_rate": intake.heart_rate,
            "oxygen_saturation": float(intake.oxygen_saturation) if intake.oxygen_saturation is not None else None,
            "created_at": intake.created_at.isoformat() if intake.created_at else None,
        },
        "entities": [
            {
                "type": e.entity_type,
                "value": e.entity_value,
                "negated": e.negated,
                "confidence": float(e.confidence) if e.confidence is not None else None,
            }
            for e in entities
        ],
        "risk": (
            {
                "score": float(risk.risk_score) if risk.risk_score is not None else None,
                "level": risk.risk_level.value if risk.risk_level else None,
                "explanation": risk.explanation,
                "confidence": float(risk.ai_confidence) if risk.ai_confidence is not None else None,
            }
            if risk
            else None
        ),
    }


def _patient_summary(patient: Patient) -> dict:
    return {
        "first_name": patient.first_name,
        "last_name": patient.last_name,
        "gender": patient.gender,
        "date_of_birth": patient.date_of_birth.isoformat() if patient.date_of_birth else None,
        "blood_group": patient.blood_group,
    }
