from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.patient import Patient
from app.models.patient_intake import PatientIntake
from app.models.risk_assessment import RiskAssessment
from app.schemas.risk import RiskAssessmentOut, RiskReviewCreate

router = APIRouter(prefix="/risk", tags=["Risk Assessment"])


@router.get("/{intake_id}", response_model=RiskAssessmentOut)
def get_risk_assessment(intake_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    assessment = db.query(RiskAssessment).filter(RiskAssessment.intake_id == intake_id).first()
    if assessment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No risk assessment found for this intake")

    intake = db.query(PatientIntake).filter(PatientIntake.id == intake_id).first()
    patient = db.query(Patient).filter(Patient.id == intake.patient_id).first() if intake else None

    if current_user.role == "patient":
        if patient is None or patient.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to access this record")
    else:
        if patient is None or patient.clinic_id != current_user.clinic_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to access this record")

    return assessment


@router.post("/{intake_id}/review", response_model=RiskAssessmentOut)
def review_risk_assessment(
    intake_id: str,
    payload: RiskReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Le médecin/admin confirme le score IA tel quel, ou l'ajuste. Chaque
    revue alimente le journal d'audit (Administration > Journal d'audit)."""
    if current_user.role not in ("doctor", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only doctors or admins can review a risk assessment")

    assessment = db.query(RiskAssessment).filter(RiskAssessment.intake_id == intake_id).first()
    if assessment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No risk assessment found for this intake")

    intake = db.query(PatientIntake).filter(PatientIntake.id == intake_id).first()
    patient = db.query(Patient).filter(Patient.id == intake.patient_id).first() if intake else None
    if patient is None or patient.clinic_id != current_user.clinic_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to access this record")

    assessment.reviewed_by = current_user.id
    assessment.reviewed_at = datetime.now(timezone.utc)
    assessment.override_score = payload.override_score
    assessment.override_level = payload.override_level
    assessment.override_note = payload.note.strip() or None

    db.commit()
    db.refresh(assessment)
    return assessment