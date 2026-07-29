"""
Researcher-specific Pydantic schemas:
  - Draft save/update/OTP request/response schemas
"""
from typing import Any, Dict, Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr


# ── Draft Schemas ─────────────────────────────────────────────────────────────

class DraftSaveRequest(BaseModel):
    """Create or upsert a draft. Keyed by email."""
    email: EmailStr
    current_step: int = 1
    form_data: Dict[str, Any] = {}


class DraftUpdateRequest(BaseModel):
    """Update an existing draft (auto-save or manual save)."""
    current_step: int
    form_data: Dict[str, Any] = {}


class DraftResponse(BaseModel):
    """Full draft object returned to frontend."""
    id: int
    email: str
    current_step: int
    form_data: Optional[Dict[str, Any]] = None
    status: str
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── OTP Schemas ───────────────────────────────────────────────────────────────

class OTPRequest(BaseModel):
    """Request an OTP to be sent to the applicant's email (stdout in dev)."""
    email: EmailStr


class OTPVerifyRequest(BaseModel):
    """Verify a submitted OTP and return the draft if valid."""
    email: EmailStr
    otp: str
