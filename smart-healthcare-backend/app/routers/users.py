from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user

from app.models.user import User
from app.schemas.auth import UserOut

router = APIRouter(prefix="/users", tags=["Users"])


def _require_admin(current_user: User) -> None:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can manage users")


@router.get("", response_model=list[UserOut])
def list_clinic_users(
    role: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Liste des utilisateurs de la clinique de l'admin connecté.
    ?role=doctor|patient|admin pour filtrer (sinon tous)."""
    _require_admin(current_user)

    query = db.query(User).filter(User.clinic_id == current_user.clinic_id)
    if role:
        query = query.filter(User.role == role)

    return query.order_by(User.full_name).all()


@router.patch("/{user_id}/status", response_model=UserOut)
def toggle_user_status(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Bascule actif/désactivé pour un utilisateur de la même clinique."""
    _require_admin(current_user)

    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot deactivate your own account")

    target = db.query(User).filter(User.id == user_id).first()
    if target is None or target.clinic_id != current_user.clinic_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found in your clinic")

    target.is_active = not target.is_active
    db.commit()
    db.refresh(target)
    return target