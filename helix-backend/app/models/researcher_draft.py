"""
ResearcherDraft — stores incomplete researcher application form data.
Completely isolated from the users table until final submission.
Draft records are NEVER exposed to Super Admin (status must be 'submitted').
OTP fields allow secure email-verified resume of draft.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from app.database.db import Base


class ResearcherDraft(Base):
    __tablename__ = "researcher_drafts"

    id      = Column(Integer, primary_key=True, autoincrement=True)

    # Keyed by email — one draft per applicant
    email   = Column(String(255), unique=True, index=True, nullable=False)

    # Which step (1–4) the applicant was on when they saved
    current_step = Column(Integer, default=1, nullable=False)

    # All form data as a JSON text blob — flexible, no per-field migrations
    form_data    = Column(Text, nullable=True)

    # OTP for secure draft resume verification
    otp_code       = Column(String(10),  nullable=True)  # 6-digit string
    otp_expires_at = Column(DateTime,    nullable=True)  # 10-minute expiry window

    # draft → submitted (only 'submitted' drafts trigger user creation)
    status = Column(String(20), default="draft", nullable=False)

    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<ResearcherDraft id={self.id} email={self.email!r} step={self.current_step} status={self.status!r}>"
