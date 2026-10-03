import enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SAEnum, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.db import Base


class UserRole(str, enum.Enum):
    """Role enum — used both in the DB column and in JWT claims."""
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    STUDENT = "STUDENT"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), nullable=False, default=UserRole.STUDENT)
    is_active = Column(Boolean, default=True, nullable=False)
    is_approved = Column(String(50), default="APPROVED", nullable=False)
    registration_reason = Column(Text, nullable=True)

    # Profile photo (Cloudinary URL)
    photo_url = Column(String(500), nullable=True)

    # Reset password OTP & expiration
    reset_otp = Column(String(10), nullable=True)
    reset_otp_expires_at = Column(DateTime(timezone=True), nullable=True)

    # Audit timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    # One-to-one link to ResearcherProfile (populated only for researcher applicants)
    researcher_profile = relationship(
        "ResearcherProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<User id={self.id} email={self.email!r} role={self.role}>"
