from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel, Field, model_validator
from app.models.patient import TreatmentStatus


class PatientBase(BaseModel):
    full_name: str = Field(min_length=2, max_length=255)
    date_of_birth: date
    gender: str = Field(min_length=1)
    blood_group: Optional[str] = None
    photo_url: Optional[str] = None
    phone: str = Field(min_length=5)
    email: Optional[str] = None
    address: str = Field(min_length=2)
    
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None

    department: Optional[str] = None
    assigned_doctor: Optional[str] = None
    primary_diagnosis: Optional[str] = None
    cancer_category: Optional[str] = None
    cancer_type: Optional[str] = None
    cancer_type_site: Optional[str] = None
    cancer_stage: Optional[str] = None
    treatment_status: Optional[TreatmentStatus] = TreatmentStatus.NEWLY_DIAGNOSED
    
    admission_date: date
    discharge_date: Optional[date] = None
    
    medical_notes: Optional[str] = None
    remarks: Optional[str] = None


class PatientCreate(PatientBase):
    pass


class PatientUpdate(BaseModel):
    full_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    photo_url: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None

    department: Optional[str] = None
    assigned_doctor: Optional[str] = None
    primary_diagnosis: Optional[str] = None
    cancer_category: Optional[str] = None
    cancer_type: Optional[str] = None
    cancer_type_site: Optional[str] = None
    cancer_stage: Optional[str] = None
    treatment_status: Optional[TreatmentStatus] = None
    
    admission_date: Optional[date] = None
    discharge_date: Optional[date] = None
    
    medical_notes: Optional[str] = None
    remarks: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def clean_empty_strings_and_enums(cls, data: dict):
        if not isinstance(data, dict):
            return data
        
        # For date fields: empty string → None is correct (these are truly optional)
        for field in ["date_of_birth", "admission_date", "discharge_date", "email", "blood_group", "photo_url"]:
            if field in data and data[field] == "":
                data[field] = None

        # For string fields that are NOT NULL in DB: empty string is fine, keep as ""
        for field in ["emergency_contact_name", "emergency_contact_phone", "emergency_contact_relationship",
                      "medical_notes", "remarks"]:
            if field in data and data[field] is None:
                data[field] = ""
        
        # Handle treatment status enum conversion
        if "treatment_status" in data and data["treatment_status"]:
            val = str(data["treatment_status"])
            mapping = {
                "NEWLY_DIAGNOSED": TreatmentStatus.NEWLY_DIAGNOSED,
                "UNDER_TREATMENT": TreatmentStatus.UNDER_TREATMENT,
                "IN_REMISSION": TreatmentStatus.IN_REMISSION,
                "PALLIATIVE": TreatmentStatus.PALLIATIVE,
                "DISCHARGED": TreatmentStatus.DISCHARGED,
                "Newly Diagnosed": TreatmentStatus.NEWLY_DIAGNOSED,
                "Under Treatment": TreatmentStatus.UNDER_TREATMENT,
                "In Remission": TreatmentStatus.IN_REMISSION,
                "Palliative": TreatmentStatus.PALLIATIVE,
                "Discharged": TreatmentStatus.DISCHARGED,
            }
            if val in mapping:
                data["treatment_status"] = mapping[val]
        
        return data



class PatientResponse(PatientBase):
    id: int
    patient_code: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
