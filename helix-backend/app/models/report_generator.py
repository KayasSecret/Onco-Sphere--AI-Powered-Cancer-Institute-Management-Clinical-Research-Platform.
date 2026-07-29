from sqlalchemy import Column, Integer, String, Date, DateTime, Text, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.db import Base
from app.models.patient import Patient
from app.models.user import User

class ReportTemplate(Base):
    __tablename__ = "report_templates"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    code = Column(String(100), unique=True, index=True, nullable=False)  # e.g., "OXIDATIVE_STRESS"
    description = Column(Text, nullable=True)
    default_disclaimer = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    parameters = relationship("ReportParameter", back_populates="template", cascade="all, delete-orphan")

class ReportParameter(Base):
    __tablename__ = "report_parameters"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    template_id = Column(Integer, ForeignKey("report_templates.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    code = Column(String(100), nullable=False)  # e.g. "FOX2", "MDA", "GRIESS", "DNPH", "TAC"
    section = Column(String(100), nullable=False)  # e.g., "Oxidative Damage", "Antioxidant Defence"
    reference_range = Column(String(100), nullable=False)
    default_interpretation = Column(String(255), nullable=False)
    unit = Column(String(50), nullable=True)
    display_order = Column(Integer, default=0, nullable=False)

    template = relationship("ReportTemplate", back_populates="parameters")

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    report_number = Column(String(100), index=True, nullable=False)  # Remove unique constraint for versioning history
    template_id = Column(Integer, ForeignKey("report_templates.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    version = Column(Integer, default=1, nullable=False)
    status = Column(String(50), default="Draft", nullable=False)  # Draft, Completed, Verified, Printed, Archived
    
    # Signatory details
    doctor_name = Column(String(255), nullable=False)
    reference_by = Column(String(255), nullable=False)
    
    # Metadata
    report_date = Column(Date, nullable=False)
    sample_type = Column(String(100), nullable=False)
    collection_date = Column(Date, nullable=False)
    lab_number = Column(String(100), nullable=False)
    overall_summary = Column(Text, nullable=True)
    
    # Calculation Scores
    damage_score = Column(Float, nullable=False, default=0.0)
    defence_score = Column(Float, nullable=False, default=0.0)
    ratio_score = Column(Float, nullable=False, default=0.0)
    
    # Audit details
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    updated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    template = relationship("ReportTemplate")
    patient = relationship("Patient")
    values = relationship("ReportValue", back_populates="report", cascade="all, delete-orphan")
    created_by = relationship("User", foreign_keys=[created_by_id])
    updated_by = relationship("User", foreign_keys=[updated_by_id])

class ReportValue(Base):
    __tablename__ = "report_values"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)
    parameter_id = Column(Integer, ForeignKey("report_parameters.id"), nullable=False)
    result_value = Column(Float, nullable=False)
    reference_range = Column(String(100), nullable=False)  # Snapshot at time of creation
    interpretation = Column(String(255), nullable=False)    # Snapshot at time of creation

    report = relationship("Report", back_populates="values")
    parameter = relationship("ReportParameter")

class ReportAuditLog(Base):
    __tablename__ = "report_audit_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    report_id = Column(Integer, nullable=False)  # Report ID or Report Number
    report_number = Column(String(100), nullable=False)
    action = Column(String(100), nullable=False)  # Created, Updated, Verified, Printed, Deleted
    user_name = Column(String(255), nullable=False)
    user_role = Column(String(50), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class DoctorSignature(Base):
    __tablename__ = "doctor_signatures"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    doctor_name = Column(String(255), nullable=False)
    signature_url = Column(String(500), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class InstituteInfo(Base):
    __tablename__ = "institute_info"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    logo_url = Column(String(500), nullable=True)
    stamp_url = Column(String(500), nullable=True)
    address = Column(Text, nullable=False)
    website = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    contact_number = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
