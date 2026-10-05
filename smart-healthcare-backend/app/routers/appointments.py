from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user

from app.models.user import User
from app.models.patient import Patient
from app.models.patient_intake import PatientIntake
from app.models.risk_assessment import RiskAssessment
from app.models.appointment import Appointment
from app.models.notification import Notification

from app.schemas.appointment import AppointmentCreate, AppointmentOut, DoctorOption

router = APIRouter(prefix="/appointments", tags=["Appointments"])


def _require_staff(current_user: User) -> None:
    """Lecture : médecin ET admin."""
    if current_user.role not in ("doctor", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors or admins can access appointments",
        )


def _require_doctor(current_user: User) -> None:
    """Écriture (création) : médecin uniquement, pas admin."""
    if current_user.role != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors can create appointments",
        )


def _latest_risk_level(db: Session, patient_id: str) -> str | None:
    """Niveau de risque de la dernière admission ÉVALUÉE de ce patient,
    ou None s'il n'a encore aucune évaluation."""
    latest_intake = (
        db.query(PatientIntake)
        .filter(PatientIntake.patient_id == patient_id)
        .order_by(PatientIntake.created_at.desc())
        .first()
    )
    if latest_intake is None:
        return None

    assessment = (
        db.query(RiskAssessment)
        .filter(RiskAssessment.intake_id == latest_intake.id)
        .order_by(RiskAssessment.created_at.desc())
        .first()
    )
    return assessment.risk_level.value if assessment else None


def _to_out(db: Session, appt: Appointment) -> AppointmentOut:
   
    patient = db.query(Patient).filter(Patient.id == appt.patient_id).first()
    doctor = db.query(User).filter(User.id == appt.doctor_id).first() if appt.doctor_id else None

    patient_name = f"{patient.first_name} {patient.last_name}" if patient else "—"
    doctor_name = doctor.full_name if doctor else None

    return AppointmentOut(
        id=appt.id,
        patient_id=appt.patient_id,
        patient_name=patient_name,
        doctor_id=appt.doctor_id,
        doctor_name=doctor_name,
        appointment_date=appt.appointment_date,
        status=appt.status,
        notes=appt.notes,
        last_risk_level=_latest_risk_level(db, appt.patient_id),
    )


@router.get("/doctors", response_model=list[DoctorOption])
def list_clinic_doctors(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Médecins de la même clinique, pour le menu déroulant du formulaire."""
    _require_staff(current_user)
    doctors = (
        db.query(User)
        .filter(User.clinic_id == current_user.clinic_id, User.role == "doctor")
        .order_by(User.full_name)
        .all()
    )
    return [DoctorOption(id=d.id, full_name=d.full_name) for d in doctors]


@router.get("/mine", response_model=list[AppointmentOut])
def list_my_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Rendez-vous du patient connecté, du plus récent/proche au plus ancien."""
    if current_user.role != "patient":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only patients can access this view")

    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if patient is None:
        return []

    appointments = (
        db.query(Appointment)
        .filter(Appointment.patient_id == patient.id)
        .order_by(Appointment.appointment_date.desc())
        .all()
    )
    return [_to_out(db, a) for a in appointments]


@router.get("/all", response_model=list[AppointmentOut])
def list_all_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Tous les rendez-vous de la clinique, tous statuts, du plus récent au
    plus ancien — vue d'ensemble pour l'administrateur (lecture seule)."""
    _require_staff(current_user)

    appointments = (
        db.query(Appointment)
        .join(Patient, Patient.id == Appointment.patient_id)
        .filter(Patient.clinic_id == current_user.clinic_id)
        .order_by(Appointment.appointment_date.desc())
        .limit(200)
        .all()
    )

    return [_to_out(db, a) for a in appointments]


@router.get("/today", response_model=list[AppointmentOut])
def list_today_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Tous les rendez-vous d'aujourd'hui de la clinique (passés et à venir,
    tous statuts) — vue d'ensemble pour l'administrateur."""
    _require_staff(current_user)

    now = datetime.now(timezone.utc)
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day + timedelta(days=1)

    appointments = (
        db.query(Appointment)
        .join(Patient, Patient.id == Appointment.patient_id)
        .filter(
            Patient.clinic_id == current_user.clinic_id,
            Appointment.appointment_date >= start_of_day,
            Appointment.appointment_date < end_of_day,
        )
        .order_by(Appointment.appointment_date.asc())
        .all()
    )

    return [_to_out(db, a) for a in appointments]


@router.get("/upcoming", response_model=list[AppointmentOut])
def list_upcoming_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Rendez-vous à venir de la clinique du médecin connecté, du plus
    proche au plus lointain."""
    _require_staff(current_user)
    now = datetime.now(timezone.utc)

    appointments = (
        db.query(Appointment)
        .join(Patient, Patient.id == Appointment.patient_id)
        .filter(
            Patient.clinic_id == current_user.clinic_id,
            Appointment.appointment_date >= now,
            Appointment.status == "scheduled",
        )
        .order_by(Appointment.appointment_date.asc())
        .all()
    )

    return [_to_out(db, a) for a in appointments]


@router.post("", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
def create_appointment(
    payload: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_doctor(current_user)

    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if patient is None or patient.clinic_id != current_user.clinic_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found in your clinic")

    doctor = db.query(User).filter(User.id == payload.doctor_id).first()
    if doctor is None or doctor.clinic_id != current_user.clinic_id or doctor.role != "doctor":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found in your clinic")

    appointment = Appointment(
        patient_id=patient.id,
        doctor_id=doctor.id,
        appointment_date=payload.appointment_date,
        notes=payload.notes,
        status="scheduled",
    )
    db.add(appointment)
    db.commit()

    # Notification patient : seulement s'il a un compte de connexion — un
    # dossier "admission directe" (patient.user_id is None) n'a personne à notifier.
    if patient.user_id is not None:
        db.add(
            Notification(
                user_id=patient.user_id,
                type="appointment",
                title="Nouveau rendez-vous",
                message=(
                    f"Dr. {doctor.full_name} a planifié un rendez-vous le "
                    f"{appointment.appointment_date.strftime('%d/%m/%Y à %H:%M')}."
                ),
                link="/my-appointments",
            )
        )
        db.commit()

    # Pas de db.refresh() : exige aussi une ligne unique par PK en base, et
    # on a déjà tout ce qu'il faut (patient/doctor déjà chargés ci-dessus).
    return AppointmentOut(
        id=appointment.id,
        patient_id=patient.id,
        patient_name=f"{patient.first_name} {patient.last_name}",
        doctor_id=doctor.id,
        doctor_name=doctor.full_name,
        appointment_date=appointment.appointment_date,
        status=appointment.status,
        notes=appointment.notes,
        last_risk_level=_latest_risk_level(db, patient.id),
    )