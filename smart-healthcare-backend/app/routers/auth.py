from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    UserOut,
    Token,
    ForgotPassword,
)
from app.security import (
    hash_password,
    verify_password,
    create_access_token,
)

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)


# ==========================
# Register
# ==========================

@router.post(
    "/register",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
)
def register(
    payload: UserRegister,
    db: Session = Depends(get_db),
):

    existing = (
        db.query(User)
        .filter(User.email == payload.email.lower())
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists",
        )

    user = User(
        full_name=payload.full_name,
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        role=payload.role,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


# ==========================
# Login
# ==========================

@router.post("/login", response_model=Token)
def login(
    payload: UserLogin,
    db: Session = Depends(get_db),
):

    user = (
        db.query(User)
        .filter(User.email == payload.email.lower())
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not verify_password(
        payload.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    token = create_access_token(user.id)

    return Token(
        access_token=token,
        token_type="bearer",
    )


# ==========================
# OAuth2 Login
# ==========================

@router.post(
    "/login/form",
    response_model=Token,
    include_in_schema=False,
)
def login_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):

    user = (
        db.query(User)
        .filter(User.email == form_data.username.lower())
        .first()
    )

    if user is None or not verify_password(
        form_data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    token = create_access_token(user.id)

    return Token(
        access_token=token,
        token_type="bearer",
    )


# ==========================
# Current user
# ==========================

@router.get(
    "/me",
    response_model=UserOut,
)
def get_me(
    current_user: User = Depends(get_current_user),
):
    return current_user


# ==========================
# Forgot password
# ==========================

@router.post("/forgot-password")
def forgot_password(
    payload: ForgotPassword,
    db: Session = Depends(get_db),
):

    email = payload.email.lower()

    db.query(User).filter(User.email == email).first()

    return {
        "message": "If an account exists for this email, a reset link has been sent."
    }