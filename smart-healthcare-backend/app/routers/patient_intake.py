from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user

from app.models.user import User
from app.models.patient import Patient
from app.models.patient_intake import PatientIntake
from app.models.risk_assessment import RiskAssessment
from app.models.extracted_entity import ExtractedEntity

from app.schemas.patient_intake import (
    PatientIntakeCreate,
    PatientIntakeUpdate,
    PatientIntakeOut,
    StaffPatientIntakeCreate,
    ExtractedEntityOut,
)
from app.services.risk_scoring import compute_risk
from app.services.nlp_service import extract_and_persist_entities

router = APIRouter(prefix="/patients/intake", tags=["Patient Intake"])


def get_or_create_patient(db: Session, current_user: User) -> Patient:
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if patient is not None:
        return patient
    name_parts = current_user.full_name.strip().split(" ", 1)
    first_name = name_parts[0] if name_parts[0] else "Patient"
    last_name = name_parts[1] if len(name_parts) > 1 else ""
    patient = Patient(
        user_id=current_user.id,
        created_by=current_user.id,
        first_name=first_name,
        last_name=last_name,
        gender="unspecified",
        date_of_birth=date(2000, 1, 1),
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


def _run_intake_pipeline(db: Session, intake: PatientIntake) -> None:
    """NLP (extraction d'entités) + calcul du score de risque pour un intake
    fraîchement créé. Partagé entre la création patient et la création staff."""

    # NLP : ne doit jamais faire échouer la soumission si le NLP plante.
    try:
        nlp_text = f"{intake.symptoms_text} {intake.medical_history or ''}"
        extract_and_persist_entities(db, intake.id, nlp_text)
        db.commit()
    except Exception:
        db.rollback()

    risk = compute_risk(
        symptoms_text=intake.symptoms_text,
        medical_history=intake.medical_history or "",
        temperature=float(intake.temperature) if intake.temperature is not None else None,
        heart_rate=intake.heart_rate,
        oxygen_saturation=float(intake.oxygen_saturation) if intake.oxygen_saturation is not None else None,
        blood_pressure=intake.blood_pressure,
    )
    assessment = RiskAssessment(
        intake_id=intake.id,
        risk_score=risk["score"],
        risk_level=risk["level"],
        explanation=risk["explanation"],
        ai_confidence=risk["confidence"],
    )
    db.add(assessment)
    db.commit()


@router.post("", response_model=PatientIntakeOut, status_code=status.HTTP_201_CREATED)
def create_patient_intake(
    payload: PatientIntakeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient = get_or_create_patient(db, current_user)

    intake = PatientIntake(
        patient_id=patient.id,
        reason_for_visit=payload.reason_for_visit,
        symptoms_text=payload.symptoms_text,
        medical_history=payload.medical_history,
        current_medications=payload.current_medications,
        allergies=payload.allergies,
        temperature=payload.temperature,
        blood_pressure=payload.blood_pressure,
        heart_rate=payload.heart_rate,
        oxygen_saturation=payload.oxygen_saturation,
        additional_notes=payload.additional_notes,
    )
    db.add(intake)
    db.commit()
    db.refresh(intake)

    _run_intake_pipeline(db, intake)

    return intake


@router.post("/staff", response_model=PatientIntakeOut, status_code=status.HTTP_201_CREATED)
def create_staff_patient_intake(
    payload: StaffPatientIntakeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admission directe créée par un médecin/admin : identité + motif de
    visite en une seule requête, sans compte de connexion pour le patient."""

    if current_user.role not in ("doctor", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors or admins can register a walk-in patient",
        )

    patient = Patient(
        user_id=None,
        created_by=current_user.id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        gender=payload.gender,
        date_of_birth=payload.date_of_birth,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)

    intake = PatientIntake(
        patient_id=patient.id,
        reason_for_visit=payload.reason_for_visit,
        symptoms_text=payload.symptoms_text,
        medical_history=payload.medical_history,
        current_medications=payload.current_medications,
        allergies=payload.allergies,
        temperature=payload.temperature,
        blood_pressure=payload.blood_pressure,
        heart_rate=payload.heart_rate,
        oxygen_saturation=payload.oxygen_saturation,
        additional_notes=payload.additional_notes,
    )
    db.add(intake)
    db.commit()
    db.refresh(intake)

    _run_intake_pipeline(db, intake)

    return intake


def _can_access(intake: PatientIntake, patient: Patient | None, current_user: User) -> bool:
    """Patient/doctor/admin : le patient ne peut voir que ses propres intakes."""
    if current_user.role in ("doctor", "admin"):
        return True
    return patient is not None and patient.user_id == current_user.id


@router.get("", response_model=list[PatientIntakeOut])
def get_all_intakes(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(PatientIntake).order_by(PatientIntake.created_at.desc())
    if current_user.role == "patient":
        own_patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if own_patient is None:
            return []
        query = query.filter(PatientIntake.patient_id == own_patient.id)
    return query.all()


@router.get("/{intake_id}", response_model=PatientIntakeOut)
def get_intake(intake_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    intake = db.query(PatientIntake).filter(PatientIntake.id == intake_id).first()
    if intake is None:
        raise HTTPException(status_code=404, detail="Patient intake not found")
    patient = db.query(Patient).filter(Patient.id == intake.patient_id).first()
    if not _can_access(intake, patient, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to access this record")
    return intake


@router.get("/{intake_id}/entities", response_model=list[ExtractedEntityOut])
def get_intake_entities(intake_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    intake = db.query(PatientIntake).filter(PatientIntake.id == intake_id).first()
    if intake is None:
        raise HTTPException(status_code=404, detail="Patient intake not found")
    patient = db.query(Patient).filter(Patient.id == intake.patient_id).first()
    if not _can_access(intake, patient, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to access this record")
    return db.query(ExtractedEntity).filter(ExtractedEntity.intake_id == intake_id).all()


@router.put("/{intake_id}", response_model=PatientIntakeOut)
def update_intake(intake_id: str, payload: PatientIntakeUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    intake = db.query(PatientIntake).filter(PatientIntake.id == intake_id).first()
    if intake is None:
        raise HTTPException(status_code=404, detail="Patient intake not found")
    patient = db.query(Patient).filter(Patient.id == intake.patient_id).first()
    if not _can_access(intake, patient, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to modify this record")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(intake, key, value)
    db.commit()
    db.refresh(intake)
    return intake


@router.delete("/{intake_id}")
def delete_intake(intake_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    intake = db.query(PatientIntake).filter(PatientIntake.id == intake_id).first()
    if intake is None:
        raise HTTPException(status_code=404, detail="Patient intake not found")
    patient = db.query(Patient).filter(Patient.id == intake.patient_id).first()
    if not _can_access(intake, patient, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to delete this record")
    db.delete(intake)
    db.commit()
    return {"message": "Patient intake deleted successfully"}