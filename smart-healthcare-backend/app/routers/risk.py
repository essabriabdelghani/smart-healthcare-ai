from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.patient import Patient
from app.models.patient_intake import PatientIntake
from app.models.risk_assessment import RiskAssessment
from app.schemas.risk import RiskAssessmentOut

router = APIRouter(prefix="/risk", tags=["Risk Assessment"])


@router.get("/{intake_id}", response_model=RiskAssessmentOut)
def get_risk_assessment(intake_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    assessment = db.query(RiskAssessment).filter(RiskAssessment.intake_id == intake_id).first()
    if assessment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No risk assessment found for this intake")

    if current_user.role == "patient":
        intake = db.query(PatientIntake).filter(PatientIntake.id == intake_id).first()
        patient = db.query(Patient).filter(Patient.id == intake.patient_id).first() if intake else None
        if patient is None or patient.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to access this record")

    return assessment