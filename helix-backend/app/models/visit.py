import enum
from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, SmallInteger
from sqlalchemy.sql import func
from app.database.db import Base


class VisitType(str, enum.Enum):
    INITIAL_CONSULTATION = "Initial Consultation"
    FOLLOW_UP = "Follow-up"
    CHEMOTHERAPY = "Chemotherapy"
    RADIATION_THERAPY = "Radiation Therapy"
    SURGERY = "Surgery"
    DIAGNOSTIC = "Diagnostic"
    EMERGENCY = "Emergency"
    TREATMENT_REVIEW = "Treatment Review"
    POST_OPERATIVE_FOLLOW_UP = "Post-operative Follow-up"


class VisitStatus(str, enum.Enum):
    SCHEDULED = "Scheduled"
    CHECKED_IN = "Checked In"
    IN_CONSULTATION = "In Consultation"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"
    NO_SHOW = "No Show"


class InvestigationStatus(str, enum.Enum):
    ORDERED = "ordered"
    IN_PROGRESS = "in_progress"
    RESULT_AVAILABLE = "result_available"


class Visit(Base):
    __tablename__ = "visits"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    visit_code = Column(String(50), unique=True, index=True, nullable=False)  # VST-2026-000001
    patient_id = Column(Integer, nullable=False)  # FK to patients.id
    doctor_id = Column(Integer, nullable=True)    # FK to users.id
    doctor_name = Column(String(255), nullable=True)  # denormalized for quick display
    department = Column(String(255), nullable=False)
    visit_type = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False, default="Scheduled")
    scheduled_at = Column(DateTime, nullable=False)
    checked_in_at = Column(DateTime, nullable=True)
    token_number = Column(String(20), nullable=True)
    room = Column(String(100), nullable=True)
    chief_complaint = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_by_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<Visit id={self.id} code={self.visit_code!r} status={self.status}>"


class VisitSymptom(Base):
    __tablename__ = "visit_symptoms"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    visit_id = Column(Integer, nullable=False)
    name = Column(String(255), nullable=False)
    severity_score = Column(SmallInteger, nullable=True)  # 0-10
    severity_label = Column(String(50), nullable=True)    # Mild/Moderate/Severe
    patient_note = Column(Text, nullable=True)
    recorded_by_role = Column(String(50), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<VisitSymptom id={self.id} visit_id={self.visit_id} name={self.name!r}>"


class VisitInvestigation(Base):
    __tablename__ = "visit_investigations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    visit_id = Column(Integer, nullable=False)
    name = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False, default="ordered")
    ordered_at = Column(DateTime, server_default=func.now(), nullable=False)
    result_url = Column(String(500), nullable=True)

    def __repr__(self):
        return f"<VisitInvestigation id={self.id} visit_id={self.visit_id} name={self.name!r}>"


class VisitPrescription(Base):
    __tablename__ = "visit_prescriptions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    visit_id = Column(Integer, nullable=False)
    medicines = Column(JSON, nullable=False)   # [{name, dose, frequency, duration}]
    instructions = Column(Text, nullable=True)
    prescribing_doctor_id = Column(Integer, nullable=True)
    prescribing_doctor_name = Column(String(255), nullable=True)
    prescribed_at = Column(DateTime, server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<VisitPrescription id={self.id} visit_id={self.visit_id}>"


class VisitTreatment(Base):
    __tablename__ = "visit_treatments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    visit_id = Column(Integer, nullable=False)
    procedure_type = Column(String(255), nullable=False)  # e.g. "Chemotherapy — Cycle 4"
    notes = Column(Text, nullable=True)
    performed_by_name = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<VisitTreatment id={self.id} visit_id={self.visit_id} procedure={self.procedure_type!r}>"


class VisitFollowUp(Base):
    __tablename__ = "visit_followups"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    visit_id = Column(Integer, nullable=False, unique=True)
    advice_text = Column(Text, nullable=True)
    next_visit_id = Column(Integer, nullable=True)
    next_appointment_note = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<VisitFollowUp id={self.id} visit_id={self.visit_id}>"
