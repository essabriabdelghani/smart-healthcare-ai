from datetime import datetime

from pydantic import BaseModel, EmailStr, ConfigDict, field_validator

from app.models.user import UserRole


# ======================================
# Register
# ======================================

class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.patient
    clinic_name: str

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, value: str):
        value = value.strip()
        if not value:
            raise ValueError("Full name is required")
        return value

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str):
        if len(value) < 8:
            raise ValueError("Password must contain at least 8 characters")
        return value

    @field_validator("clinic_name")
    @classmethod
    def validate_clinic_name(cls, value: str):
        value = value.strip()
        if not value:
            raise ValueError("Clinic name is required")
        return value


# ======================================
# Login
# ======================================

class UserLogin(BaseModel):
    email: EmailStr
    password: str


# ======================================
# Forgot Password
# ======================================

class ForgotPassword(BaseModel):
    email: EmailStr


# ======================================
# User Response
# ======================================

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr
    role: UserRole
    clinic_id: str
    clinic_name: str | None = None
    phone: str | None = None
    is_active: bool
    created_at: datetime


# ======================================
# Update Profile / Password (Paramètres)
# ======================================

class ProfileUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, value: str | None):
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("Full name cannot be empty")
        return value


class PasswordChange(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, value: str):
        if len(value) < 8:
            raise ValueError("Password must contain at least 8 characters")
        return value


# ======================================
# JWT Token
# ======================================

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: str | None = None