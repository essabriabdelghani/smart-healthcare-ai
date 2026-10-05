from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.patient import Patient
from app.models.ai_conversation import AIConversation, AssistantMode
from app.schemas.ai_assistant import AskRequest, AskResponse
from app.services.ai_assistant.orchestrator import ask_assistant

router = APIRouter(prefix="/ai-assistant", tags=["AI Assistant"])


def _can_access_patient(patient: Patient, current_user: User) -> bool:
    """Même règle d'accès que le reste de l'app : un patient ne voit que son
    propre dossier, un médecin/admin uniquement les patients de sa clinique."""
    if current_user.role == "patient":
        return patient.user_id == current_user.id
    return patient.clinic_id == current_user.clinic_id


@router.post("/ask", response_model=AskResponse)
def ask(
    payload: AskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.patient_id:
        patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
        if patient is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
        if not _can_access_patient(patient, current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not allowed to access this patient",
            )

    try:
        result = ask_assistant(
            db=db,
            question=payload.question,
            patient_id=payload.patient_id,
            intake_id=payload.intake_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except RuntimeError as exc:
        
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    log = AIConversation(
        user_id=current_user.id,
        patient_id=payload.patient_id,
        intake_id=payload.intake_id,
        mode=AssistantMode(result["mode"]),
        question=payload.question,
        answer=result["answer"],
        sources=str(result["sources"]) if result["sources"] else None,
    )
    db.add(log)
    db.commit()

    return AskResponse(**result)
