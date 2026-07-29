import re
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database.db import get_db
from app.models.user import UserRole
from app.models.patient import Patient, TreatmentStatus, PatientReport, PatientCancerImage
from app.schemas.patient import PatientCreate, PatientUpdate, PatientResponse
from app.middleware.auth import require_roles, get_current_user

router = APIRouter(prefix="/patients", tags=["Patient Registry"])


def generate_icsr_patient_code(db: Session) -> str:
    """
    Generates a sequential, unique patient code in the format 'ICSR-00001', 'ICSR-00002', etc.
    Finds the maximum numerical suffix among existing ICSR patient codes and increments by 1.
    If no ICSR- codes exist yet, starts at ICSR-00001.
    """
    existing_codes = (
        db.query(Patient.patient_code)
        .filter(Patient.patient_code.like("ICSR-%"))
        .all()
    )

    max_num = 0
    for (code,) in existing_codes:
        if code:
            match = re.search(r"ICSR-(\d+)", code)
            if match:
                num = int(match.group(1))
                if num > max_num:
                    max_num = num

    if max_num == 0:
        # Check if there are existing non-ICSR patients in DB to continue sequence smoothly
        total_patients = db.query(Patient).count()
        max_num = total_patients

    next_num = max_num + 1
    patient_code = f"ICSR-{next_num:05d}"

    # Fallback uniqueness check
    while db.query(Patient).filter(Patient.patient_code == patient_code).first():
        next_num += 1
        patient_code = f"ICSR-{next_num:05d}"

    return patient_code


@router.get("", response_model=dict)
def list_patients(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    status_filter: Optional[TreatmentStatus] = Query(None, alias="status"),
    department: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),  # Enforce authentication for all roles
):
    """
    List patients in the registry.
    Supports debounced search (by name or code) and column filters (department, status).
    """
    query = db.query(Patient)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Patient.full_name.ilike(search_term),
                Patient.patient_code.ilike(search_term),
            )
        )

    if status_filter:
        query = query.filter(Patient.treatment_status == status_filter)

    if department:
        query = query.filter(Patient.department == department)

    total = query.count()
    patients = query.order_by(Patient.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": [PatientResponse.model_validate(p) for p in patients],
    }


@router.post("", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
def create_patient(
    payload: PatientCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    """
    Register a new patient.
    Requires ADMIN or SUPER_ADMIN role.
    Generates an auto-incrementing sequential patient code (e.g. ICSR-00001, ICSR-00002).
    """
    patient_code = generate_icsr_patient_code(db)

    patient_data = payload.model_dump()
    if not patient_data.get("blood_group"):
        patient_data["blood_group"] = "N/A"
    if not patient_data.get("cancer_type_site"):
        patient_data["cancer_type_site"] = f"{patient_data.get('cancer_category')} - {patient_data.get('cancer_type')}"
    if not patient_data.get("primary_diagnosis"):
        cat = patient_data.get("cancer_category") or ""
        ctype = patient_data.get("cancer_type") or ""
        patient_data["primary_diagnosis"] = f"{cat} - {ctype}".strip(" - ") or "General Oncology Case"
    if not patient_data.get("assigned_doctor"):
        patient_data["assigned_doctor"] = "Unassigned"

    if not patient_data.get("department"):
        patient_data["department"] = "Oncology"
    if not patient_data.get("cancer_category"):
        patient_data["cancer_category"] = "Unspecified"
    if not patient_data.get("cancer_type"):
        patient_data["cancer_type"] = "Unspecified"
    if not patient_data.get("cancer_stage"):
        patient_data["cancer_stage"] = "Not Staged"
    if not patient_data.get("treatment_status"):
        patient_data["treatment_status"] = "NEWLY_DIAGNOSED"
    if not patient_data.get("admission_date"):
        patient_data["admission_date"] = date.today()

    if not patient_data.get("email"):
        patient_data["email"] = None
    if not patient_data.get("emergency_contact_name"):
        patient_data["emergency_contact_name"] = ""
    if not patient_data.get("emergency_contact_phone"):
        patient_data["emergency_contact_phone"] = ""
    if not patient_data.get("emergency_contact_relationship"):
        patient_data["emergency_contact_relationship"] = ""
    if not patient_data.get("photo_url"):
        patient_data["photo_url"] = ""
    if not patient_data.get("medical_notes"):
        patient_data["medical_notes"] = ""
    if not patient_data.get("remarks"):
        patient_data["remarks"] = ""

    new_patient = Patient(
        patient_code=patient_code,
        **patient_data,
    )
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)
    return new_patient


@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient_detail(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Retrieve details for a single patient."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found.",
        )
    return patient


@router.put("/{patient_id}", response_model=PatientResponse)
def update_patient(
    patient_id: int,
    payload: PatientUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    """
    Update patient details.
    Requires ADMIN or SUPER_ADMIN role.
    """
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found.",
        )

    update_data = payload.model_dump(exclude_unset=True)
    if "cancer_category" in update_data or "cancer_type" in update_data:
        cat = update_data.get("cancer_category", patient.cancer_category)
        typ = update_data.get("cancer_type", patient.cancer_type)
        if cat and typ:
            update_data["cancer_type_site"] = f"{cat} - {typ}"

    for key, value in update_data.items():
        setattr(patient, key, value)

    db.commit()
    db.refresh(patient)
    return patient


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN])),
):
    """
    Delete patient.
    Requires SUPER_ADMIN or ADMIN role.
    """
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found.",
        )

    db.delete(patient)
    db.commit()
    return None


from pydantic import BaseModel

class ReportResponse(BaseModel):
    id: int
    patient_id: int
    title: str
    file_url: str
    file_type: str
    created_at: datetime

    class Config:
        from_attributes = True

class CancerImageResponse(BaseModel):
    id: int
    patient_id: int
    title: Optional[str] = None
    image_url: str
    created_at: datetime

    class Config:
        from_attributes = True

@router.get("/{patient_id}/reports", response_model=List[ReportResponse])
def list_patient_reports(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Retrieve all reports for a specific patient, ordered by date."""
    reports = db.query(PatientReport).filter(PatientReport.patient_id == patient_id).order_by(PatientReport.created_at.desc()).all()
    return reports

class ReportCreate(BaseModel):
    title: str
    file_url: str
    file_type: str

@router.post("/{patient_id}/reports", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def create_patient_report(
    patient_id: int,
    payload: ReportCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    """Create a new report record for a patient."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")
        
    new_report = PatientReport(
        patient_id=patient_id,
        title=payload.title,
        file_url=payload.file_url,
        file_type=payload.file_type
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)
    return new_report

@router.get("/{patient_id}/cancer-images", response_model=List[CancerImageResponse])
def list_patient_cancer_images(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Retrieve all cancer images for a specific patient, ordered by date."""
    images = db.query(PatientCancerImage).filter(PatientCancerImage.patient_id == patient_id).order_by(PatientCancerImage.created_at.desc()).all()
    return images

class CancerImageCreate(BaseModel):
    title: Optional[str] = None
    image_url: str

@router.post("/{patient_id}/cancer-images", response_model=CancerImageResponse, status_code=status.HTTP_201_CREATED)
def create_patient_cancer_image(
    patient_id: int,
    payload: CancerImageCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    """Add a new cancer image to a patient record."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")
        
    new_img = PatientCancerImage(
        patient_id=patient_id,
        title=payload.title,
        image_url=payload.image_url
    )
    db.add(new_img)
    db.commit()
    db.refresh(new_img)
    return new_img


@router.delete("/{patient_id}/reports/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient_report(
    patient_id: int,
    report_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    """Delete a patient report record."""
    report = db.query(PatientReport).filter(
        PatientReport.id == report_id,
        PatientReport.patient_id == patient_id
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")
        
    db.delete(report)
    db.commit()
    return None

