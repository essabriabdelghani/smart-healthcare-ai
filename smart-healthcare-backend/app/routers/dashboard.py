from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user

from app.models.user import User
from app.models.patient import Patient
from app.models.patient_intake import PatientIntake
from app.models.risk_assessment import RiskAssessment, RiskLevel
from app.schemas.dashboard import DoctorPatientRow

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


@router.get("/patients", response_model=list[DoctorPatientRow])
def doctor_patients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Vue d'ensemble pour le médecin/admin : chaque admission avec
    l'identité du patient et son évaluation de risque, triée par date
    décroissante (les cas les plus récents en premier)."""

    if current_user.role not in ("doctor", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors or admins can access this view",
        )

    rows = (
        db.query(PatientIntake, Patient, RiskAssessment)
        .join(Patient, Patient.id == PatientIntake.patient_id)
        .outerjoin(RiskAssessment, RiskAssessment.intake_id == PatientIntake.id)
        .order_by(PatientIntake.created_at.desc())
        .all()
    )

    return [
        DoctorPatientRow(
            intake_id=intake.id,
            patient_id=patient.id,
            first_name=patient.first_name,
            last_name=patient.last_name,
            gender=patient.gender,
            date_of_birth=patient.date_of_birth.isoformat(),
            reason_for_visit=intake.reason_for_visit,
            symptoms_text=intake.symptoms_text,
            created_at=intake.created_at.isoformat(),
            risk_score=assessment.risk_score if assessment else None,
            risk_level=assessment.risk_level.value if assessment else None,
            has_account=patient.user_id is not None,
        )
        for intake, patient, assessment in rows
    ]


@router.get("/stats")
def dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    total_patients = db.query(Patient).count()

    total_intakes = db.query(PatientIntake).count()

    total_assessments = db.query(RiskAssessment).count()

    low = db.query(RiskAssessment).filter(
        RiskAssessment.risk_level == RiskLevel.low
    ).count()

    medium = db.query(RiskAssessment).filter(
        RiskAssessment.risk_level == RiskLevel.medium
    ).count()

    high = db.query(RiskAssessment).filter(
        RiskAssessment.risk_level == RiskLevel.high
    ).count()

    critical = db.query(RiskAssessment).filter(
        RiskAssessment.risk_level == RiskLevel.critical
    ).count()

    return {
        "total_patients": total_patients,
        "total_intakes": total_intakes,
        "total_assessments": total_assessments,
        "low_risk": low,
        "medium_risk": medium,
        "high_risk": high,
        "critical_risk": critical,
    }