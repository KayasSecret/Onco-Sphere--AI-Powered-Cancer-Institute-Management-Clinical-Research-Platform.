"""
ResearcherProfile — stores all researcher-specific fields.
Linked one-to-one with the User table via user_id.
The User table stays clean (auth + approval fields only).
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey, Boolean
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.db import Base


class ResearcherProfile(Base):
    __tablename__ = "researcher_profiles"

    id      = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)

    # ── Personal (beyond auth fields) ───────────────────────────────────────
    phone         = Column(String(50),  nullable=True)
    date_of_birth = Column(String(20),  nullable=True)  # stored as ISO string
    gender        = Column(String(20),  nullable=True)

    # ── Academic Background ──────────────────────────────────────────────────
    institution     = Column(String(255), nullable=True)
    qualification   = Column(String(100), nullable=True)
    specialization  = Column(String(255), nullable=True)
    researcher_role = Column(String(100), nullable=True)
    experience_years= Column(String(50),  nullable=True)
    linkedin_url    = Column(String(500), nullable=True)

    # ── Research Intent ──────────────────────────────────────────────────────
    research_area      = Column(String(100), nullable=True)
    cancer_interest    = Column(String(255), nullable=True)
    research_duration  = Column(String(50),  nullable=True)
    supervisor_name    = Column(String(255), nullable=True)
    prior_work_details = Column(Text,        nullable=True)

    # ── Document URLs (Cloudinary or local fallback) ─────────────────────────
    id_proof_url         = Column(String(500), nullable=True)
    institutional_id_url = Column(String(500), nullable=True)
    letter_of_intent_url = Column(String(500), nullable=True)
    publications_url     = Column(String(500), nullable=True)

    # ── Audit ────────────────────────────────────────────────────────────────
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # ── ORM relationship back to User ────────────────────────────────────────
    user = relationship("User", back_populates="researcher_profile")

    def __repr__(self):
        return f"<ResearcherProfile user_id={self.user_id} institution={self.institution!r}>"
