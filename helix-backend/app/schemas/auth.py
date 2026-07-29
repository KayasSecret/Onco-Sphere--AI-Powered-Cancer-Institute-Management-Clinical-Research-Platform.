from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from app.models.user import UserRole


# ── Request schemas ──────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    remember_me: bool = False


class RegisterRequest(BaseModel):
    # ── Auth (required) ──────────────────────────────────────────────────────
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, description="Minimum 8 characters")
    role: UserRole = UserRole.STUDENT
    registration_reason: str = Field(..., min_length=30, max_length=2000)

    # ── Personal ─────────────────────────────────────────────────────────────
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    photo_url: Optional[str] = None

    # ── Academic ─────────────────────────────────────────────────────────────
    institution: Optional[str] = None
    qualification: Optional[str] = None
    specialization: Optional[str] = None
    researcher_role: Optional[str] = None
    experience_years: Optional[str] = None
    linkedin_url: Optional[str] = None

    # ── Research Intent ──────────────────────────────────────────────────────
    research_area: Optional[str] = None
    cancer_interest: Optional[str] = None
    research_duration: Optional[str] = None
    supervisor_name: Optional[str] = None
    prior_work_details: Optional[str] = None

    # ── Document URLs (Cloudinary) ───────────────────────────────────────────
    id_proof_url: Optional[str] = None
    institutional_id_url: Optional[str] = None
    letter_of_intent_url: Optional[str] = None
    publications_url: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class VerifyResetOTPRequest(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8)



class RefreshTokenRequest(BaseModel):
    refresh_token: str


# ── Response schemas ─────────────────────────────────────────────────────────

class ResearcherProfileResponse(BaseModel):
    """Nested researcher profile — embedded inside UserResponse for admin view."""
    id: int
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    institution: Optional[str] = None
    qualification: Optional[str] = None
    specialization: Optional[str] = None
    researcher_role: Optional[str] = None
    experience_years: Optional[str] = None
    linkedin_url: Optional[str] = None
    research_area: Optional[str] = None
    cancer_interest: Optional[str] = None
    research_duration: Optional[str] = None
    supervisor_name: Optional[str] = None
    prior_work_details: Optional[str] = None
    id_proof_url: Optional[str] = None
    institutional_id_url: Optional[str] = None
    letter_of_intent_url: Optional[str] = None
    publications_url: Optional[str] = None

    model_config = {"from_attributes": True}


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: UserRole
    is_active: bool
    is_approved: str
    registration_reason: Optional[str] = None
    photo_url: Optional[str] = None

    # Embedded researcher profile (None for users created by Super Admin directly)
    researcher_profile: Optional[ResearcherProfileResponse] = None

    model_config = {"from_attributes": True}


class RegisterResponse(BaseModel):
    pending: bool = False
    message: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    user: Optional[UserResponse] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class MessageResponse(BaseModel):
    message: str
