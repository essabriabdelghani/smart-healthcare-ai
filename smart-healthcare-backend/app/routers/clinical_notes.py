from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user

from app.models.user import User
from app.models.patient import Patient
from app.models.clinical_note import ClinicalNote

from app.schemas.clinical_note import ClinicalNoteCreate, ClinicalNoteOut

router = APIRouter(prefix="/patients", tags=["Clinical Notes"])


def _get_accessible_patient(db: Session, patient_id: str, current_user: User) -> Patient:
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    if current_user.role == "patient":
        if patient.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to access this record")
    elif patient.clinic_id != current_user.clinic_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to access this record")

    return patient


def _to_out(db: Session, note: ClinicalNote) -> ClinicalNoteOut:
    # Requête explicite plutôt que note.doctor (relationship) : évite tout
    # risque de MultipleResultsFound comme rencontré sur appointments.py.
    doctor = db.query(User).filter(User.id == note.doctor_id).first() if note.doctor_id else None
    return ClinicalNoteOut(
        id=note.id,
        patient_id=note.patient_id,
        doctor_id=note.doctor_id,
        doctor_name=doctor.full_name if doctor else None,
        note=note.note,
        created_at=note.created_at,
    )


@router.get("/{patient_id}/notes", response_model=list[ClinicalNoteOut])
def list_clinical_notes(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Historique des notes cliniques d'un patient, plus récentes en premier.
    Un patient peut lire ses propres notes ; un médecin/admin celles des
    patients de sa clinique uniquement."""
    _get_accessible_patient(db, patient_id, current_user)

    notes = (
        db.query(ClinicalNote)
        .filter(ClinicalNote.patient_id == patient_id)
        .order_by(ClinicalNote.created_at.desc())
        .all()
    )
    return [_to_out(db, n) for n in notes]


@router.post("/{patient_id}/notes", response_model=ClinicalNoteOut, status_code=status.HTTP_201_CREATED)
def create_clinical_note(
    patient_id: str,
    payload: ClinicalNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ajoute une note clinique. Réservé aux médecins/admins de la clinique
    du patient — un patient ne peut pas écrire ses propres notes cliniques."""
    if current_user.role not in ("doctor", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors or admins can write clinical notes",
        )

    patient = _get_accessible_patient(db, patient_id, current_user)

    note = ClinicalNote(
        patient_id=patient.id,
        doctor_id=current_user.id,
        note=payload.note,
    )
    db.add(note)
    db.commit()

    # Pas de db.refresh() : on a déjà tout ce qu'il faut (patient/current_user
    # déjà chargés) — même précaution que pour appointments.py.
    return _to_out(db, note)