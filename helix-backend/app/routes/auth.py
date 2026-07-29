from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    RefreshTokenRequest,
    TokenResponse,
    RegisterResponse,
    UserResponse,
    MessageResponse,
    ForgotPasswordRequest,
    VerifyResetOTPRequest,
    ResetPasswordRequest,
)
from app.services.auth_service import (
    login_user,
    register_user,
    refresh_access_token,
    forgot_password_service,
    verify_reset_otp_service,
    reset_password_service,
)
from app.services import email_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate with email + password, receive JWT access + refresh tokens."""
    return login_user(payload, db)


@router.post("/register", response_model=RegisterResponse, status_code=201)
def register(
    payload: RegisterRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Register a new user / researcher.
    On successful submission, a non-blocking confirmation email is queued
    via BackgroundTasks so the API response is never delayed by email sending.
    """
    result = register_user(payload, db)

    # Queue registration confirmation email as a background task.
    if result.pending:
        background_tasks.add_task(
            email_service.send_registration_confirmation,
            user_email=payload.email,
            user_name=payload.full_name,
            institution=payload.institution or "N/A",
            researcher_role=payload.researcher_role or "N/A",
            research_area=payload.research_area or "N/A",
        )

    return result


@router.post("/refresh", response_model=dict)
def refresh(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Exchange a valid refresh token for a new access token."""
    return refresh_access_token(payload.refresh_token, db)


@router.post("/logout", response_model=MessageResponse)
def logout(current_user: User = Depends(get_current_user)):
    """Logout -- client-side token deletion."""
    return {"message": "Logged out successfully. Please discard your tokens."}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return current_user


@router.post("/forgot-password", response_model=dict)
def forgot_password(
    payload: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Generate 6-digit OTP and send via email for password reset."""
    return forgot_password_service(payload, background_tasks, db)


@router.post("/verify-reset-otp", response_model=dict)
def verify_reset_otp(
    payload: VerifyResetOTPRequest,
    db: Session = Depends(get_db),
):
    """Verify 6-digit OTP code and return short-lived password reset token."""
    return verify_reset_otp_service(payload, db)


@router.post("/reset-password", response_model=dict)
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """Reset user password using token."""
    return reset_password_service(payload, db)

