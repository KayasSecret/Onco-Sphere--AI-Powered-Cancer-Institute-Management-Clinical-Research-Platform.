import enum
from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Date, DateTime, Enum as SAEnum, Text
from sqlalchemy.sql import func
from app.database.db import Base


class TreatmentStatus(str, enum.Enum):
    NEWLY_DIAGNOSED = "Newly Diagnosed"
    UNDER_TREATMENT = "Under Treatment"
    IN_REMISSION = "In Remission"
    PALLIATIVE = "Palliative"
    DISCHARGED = "Discharged"


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Auto-generated patient code (e.g., HLX-10001)
    patient_code = Column(String(50), unique=True, index=True, nullable=False)
    
    # Core Identity Fields
    full_name = Column(String(255), nullable=False)
    date_of_birth = Column(Date, nullable=False)
    gender = Column(String(50), nullable=False)
    blood_group = Column(String(20), nullable=True)
    photo_url = Column(String(500), nullable=True)

    # Contact Details
    phone = Column(String(50), nullable=False)
    email = Column(String(255), nullable=True)
    address = Column(Text, nullable=False)

    # Emergency Contact
    emergency_contact_name = Column(String(255), nullable=True)
    emergency_contact_phone = Column(String(50), nullable=True)
    emergency_contact_relationship = Column(String(100), nullable=True)

    # Clinical Fields
    department = Column(String(255), nullable=False)
    assigned_doctor = Column(String(255), nullable=False)
    primary_diagnosis = Column(Text, nullable=False)
    cancer_type_site = Column(String(255), nullable=False)
    cancer_category = Column(String(255), nullable=True)
    cancer_type = Column(String(255), nullable=True)
    cancer_stage = Column(String(50), nullable=False)  # Stage I, II, IIIa, etc.
    treatment_status = Column(SAEnum(TreatmentStatus), nullable=False, default=TreatmentStatus.NEWLY_DIAGNOSED)
    
    # Dates
    admission_date = Column(Date, nullable=False)
    discharge_date = Column(Date, nullable=True)

    # Free Text Clinical Notes
    medical_notes = Column(Text, nullable=True)
    remarks = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<Patient id={self.id} code={self.patient_code} name={self.full_name!r}>"


class PatientReport(Base):
    __tablename__ = "patient_reports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    file_url = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class PatientCancerImage(Base):
    __tablename__ = "patient_cancer_images"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(Integer, nullable=False)
    title = Column(String(255), nullable=True)
    image_url = Column(String(500), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

