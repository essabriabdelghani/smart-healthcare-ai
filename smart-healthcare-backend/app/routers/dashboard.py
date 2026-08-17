from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user

from app.models.user import User
from app.models.patient import Patient
from app.models.patient_intake import PatientIntake
from app.models.risk_assessment import RiskAssessment, RiskLevel
from app.schemas.dashboard import DoctorPatientRow, DashboardStatsOut
from app.schemas.risk import AuditLogEntry

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
        .filter(Patient.clinic_id == current_user.clinic_id)
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
            emergency_phone=patient.emergency_phone,
        )
        for intake, patient, assessment in rows
    ]


@router.get("/audit-log", response_model=list[AuditLogEntry])
def audit_log(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Historique réel des revues cliniques : confirmations et ajustements
    du score IA par les médecins de la clinique."""
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can access the audit log")

    rows = (
        db.query(RiskAssessment, PatientIntake, Patient, User)
        .join(PatientIntake, PatientIntake.id == RiskAssessment.intake_id)
        .join(Patient, Patient.id == PatientIntake.patient_id)
        .outerjoin(User, User.id == RiskAssessment.reviewed_by)
        .filter(Patient.clinic_id == current_user.clinic_id, RiskAssessment.reviewed_at.isnot(None))
        .order_by(RiskAssessment.reviewed_at.desc())
        .limit(50)
        .all()
    )

    return [
        AuditLogEntry(
            intake_id=intake.id,
            patient_name=f"{patient.first_name} {patient.last_name}",
            doctor_name=doctor.full_name if doctor else None,
            ai_score=float(assessment.risk_score),
            ai_level=assessment.risk_level,
            override_score=float(assessment.override_score) if assessment.override_score is not None else None,
            override_level=assessment.override_level,
            was_modified=assessment.override_score is not None or assessment.override_level is not None,
            reviewed_at=assessment.reviewed_at,
        )
        for assessment, intake, patient, doctor in rows
    ]


@router.get("/stats", response_model=DashboardStatsOut)
def dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    total_patients = db.query(Patient).filter(Patient.clinic_id == current_user.clinic_id).count()

    total_users = db.query(User).filter(User.clinic_id == current_user.clinic_id).count()

    doctors_count = (
        db.query(User)
        .filter(User.clinic_id == current_user.clinic_id, User.role == "doctor")
        .count()
    )

    total_intakes = (
        db.query(PatientIntake)
        .join(Patient, Patient.id == PatientIntake.patient_id)
        .filter(Patient.clinic_id == current_user.clinic_id)
        .count()
    )

    total_assessments = (
        db.query(RiskAssessment)
        .join(PatientIntake, PatientIntake.id == RiskAssessment.intake_id)
        .join(Patient, Patient.id == PatientIntake.patient_id)
        .filter(Patient.clinic_id == current_user.clinic_id)
        .count()
    )

    def _count_by_level(level: RiskLevel) -> int:
        return (
            db.query(RiskAssessment)
            .join(PatientIntake, PatientIntake.id == RiskAssessment.intake_id)
            .join(Patient, Patient.id == PatientIntake.patient_id)
            .filter(Patient.clinic_id == current_user.clinic_id, RiskAssessment.risk_level == level)
            .count()
        )

    low = _count_by_level(RiskLevel.low)
    medium = _count_by_level(RiskLevel.medium)
    high = _count_by_level(RiskLevel.high)
    critical = _count_by_level(RiskLevel.critical)

    return {
        "total_patients": total_patients,
        "total_intakes": total_intakes,
        "total_assessments": total_assessments,
        "total_users": total_users,
        "doctors_count": doctors_count,
        "low_risk": low,
        "medium_risk": medium,
        "high_risk": high,
        "critical_risk": critical,
    }