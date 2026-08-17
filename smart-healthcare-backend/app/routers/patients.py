from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user

from app.models.user import User
from app.models.patient import Patient

from app.schemas.patient import (
    PatientCreate,
    PatientUpdate,
    PatientOut,
)

router = APIRouter(
    prefix="/patients",
    tags=["Patients"],
)


def _can_access_patient(patient: Patient, current_user: User) -> bool:
    """Un patient ne voit que son propre dossier. Un médecin/admin ne voit
    que les dossiers de SA clinique (pas ceux des autres cliniques)."""
    if current_user.role == "patient":
        return patient.user_id == current_user.id
    return patient.clinic_id == current_user.clinic_id


# ==========================
# Create Patient
# ==========================

@router.post(
    "",
    response_model=PatientOut,
    status_code=status.HTTP_201_CREATED,
)
def create_patient(
    payload: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    existing = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A patient profile already exists for this account",
        )

    patient = Patient(
        user_id=current_user.id,
        created_by=current_user.id,
        clinic_id=current_user.clinic_id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        gender=payload.gender,
        date_of_birth=payload.date_of_birth,
        blood_group=payload.blood_group,
        height=payload.height,
        weight=payload.weight,
        emergency_contact=payload.emergency_contact,
        emergency_phone=payload.emergency_phone,
    )

    db.add(patient)
    db.commit()
    db.refresh(patient)

    return patient


# ==========================
# Get My Patient Profile
# ==========================
# IMPORTANT : cette route DOIT être déclarée avant "/{patient_id}",
# sinon "/patients/me" est interceptée par get_patient(patient_id="me").

@router.get("/me", response_model=PatientOut)
def get_my_patient(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()

    if patient is None:
        raise HTTPException(
            status_code=404,
            detail="No patient profile found for this account",
        )

    return patient


# ==========================
# Get All Patients
# ==========================

@router.get("", response_model=list[PatientOut])
def get_patients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Un patient ne voit que son propre profil.
    if current_user.role == "patient":
        return db.query(Patient).filter(Patient.user_id == current_user.id).all()

    # Un médecin/admin ne voit que les patients de SA clinique.
    return db.query(Patient).filter(Patient.clinic_id == current_user.clinic_id).all()


# ==========================
# Get Patient
# ==========================

@router.get("/{patient_id}", response_model=PatientOut)
def get_patient(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    patient = db.query(Patient).filter(
        Patient.id == patient_id
    ).first()

    if patient is None:
        raise HTTPException(
            status_code=404,
            detail="Patient not found",
        )

    if not _can_access_patient(patient, current_user):
        raise HTTPException(status_code=403, detail="Not allowed to access this record")

    return patient


# ==========================
# Update Patient
# ==========================

@router.put("/{patient_id}", response_model=PatientOut)
def update_patient(
    patient_id: str,
    payload: PatientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    patient = db.query(Patient).filter(
        Patient.id == patient_id
    ).first()

    if patient is None:
        raise HTTPException(
            status_code=404,
            detail="Patient not found",
        )

    if not _can_access_patient(patient, current_user):
        raise HTTPException(status_code=403, detail="Not allowed to modify this record")

    update_data = payload.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(patient, key, value)

    db.commit()
    db.refresh(patient)

    return patient


# ==========================
# Delete Patient
# ==========================

@router.delete("/{patient_id}")
def delete_patient(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    patient = db.query(Patient).filter(
        Patient.id == patient_id
    ).first()

    if patient is None:
        raise HTTPException(
            status_code=404,
            detail="Patient not found",
        )

    if not _can_access_patient(patient, current_user):
        raise HTTPException(status_code=403, detail="Not allowed to delete this record")

    db.delete(patient)
    db.commit()

    return {
        "message": "Patient deleted successfully"
    }