import re
from typing import List, Optional
from datetime import datetime, date
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
        patient_data["treatment_status"] = TreatmentStatus.NEWLY_DIAGNOSED
    else:
        # Handle if treatment_status came as an enum key string like "UNDER_TREATMENT"
        ts_val = patient_data["treatment_status"]
        if isinstance(ts_val, str):
            ts_key_map = {
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
            if ts_val in ts_key_map:
                patient_data["treatment_status"] = ts_key_map[ts_val]
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
    current_user = Depends(get_current_user),
):
    """
    Update patient details.
    Available to authenticated users.
    """
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found.",
        )

    update_data = payload.model_dump(exclude_unset=True)

    # Ensure non-nullable DB columns have safe fallbacks
    if "blood_group" in update_data and not update_data["blood_group"]:
        update_data["blood_group"] = patient.blood_group or ""
    if "department" in update_data and not update_data["department"]:
        update_data["department"] = patient.department or "Oncology"
    if "assigned_doctor" in update_data and not update_data["assigned_doctor"]:
        update_data["assigned_doctor"] = patient.assigned_doctor or "Unassigned"
    if "primary_diagnosis" in update_data and not update_data["primary_diagnosis"]:
        update_data["primary_diagnosis"] = patient.primary_diagnosis or "General Oncology Case"
    if "cancer_stage" in update_data and not update_data["cancer_stage"]:
        update_data["cancer_stage"] = patient.cancer_stage or "Not Staged"
    if "admission_date" in update_data and not update_data["admission_date"]:
        update_data["admission_date"] = patient.admission_date or date.today()

    # Emergency contact fields — DB has NOT NULL; use existing values or empty string
    if "emergency_contact_name" not in update_data or update_data["emergency_contact_name"] is None:
        update_data["emergency_contact_name"] = patient.emergency_contact_name or ""
    if "emergency_contact_phone" not in update_data or update_data["emergency_contact_phone"] is None:
        update_data["emergency_contact_phone"] = patient.emergency_contact_phone or ""
    if "emergency_contact_relationship" not in update_data or update_data["emergency_contact_relationship"] is None:
        update_data["emergency_contact_relationship"] = patient.emergency_contact_relationship or ""

    # Other nullable-but-safe fields
    if "photo_url" not in update_data or update_data["photo_url"] is None:
        update_data["photo_url"] = patient.photo_url or ""
    if "medical_notes" not in update_data or update_data["medical_notes"] is None:
        update_data["medical_notes"] = patient.medical_notes or ""
    if "remarks" not in update_data or update_data["remarks"] is None:
        update_data["remarks"] = patient.remarks or ""

    # treatment_status: ensure it never becomes None
    if "treatment_status" not in update_data or update_data["treatment_status"] is None:
        update_data["treatment_status"] = patient.treatment_status

    if "cancer_category" in update_data or "cancer_type" in update_data:
        cat = update_data.get("cancer_category", patient.cancer_category)
        typ = update_data.get("cancer_type", patient.cancer_type)
        if cat or typ:
            update_data["cancer_type_site"] = f"{cat or 'Unspecified'} - {typ or 'Unspecified'}"

    for key, value in update_data.items():
        setattr(patient, key, value)

    try:
        db.commit()
        db.refresh(patient)
        return patient
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update patient record: {str(e)}",
        )


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
    captured_at: Optional[datetime] = None
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
    captured_at: Optional[datetime] = None  # exact capture/upload timestamp from frontend

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
        image_url=payload.image_url,
        captured_at=payload.captured_at or datetime.utcnow(),
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


# ── Cancer Image: Delete ──────────────────────────────────────────────────────
@router.delete("/{patient_id}/cancer-images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient_cancer_image(
    patient_id: int,
    image_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    """Delete a cancer image record for a patient."""
    img = db.query(PatientCancerImage).filter(
        PatientCancerImage.id == image_id,
        PatientCancerImage.patient_id == patient_id,
    ).first()
    if not img:
        raise HTTPException(status_code=404, detail="Cancer image not found.")
    db.delete(img)
    db.commit()
    return None


# ── Cancer Image: Rename (PATCH title only) ────────────────────────────────────
class CancerImageRename(BaseModel):
    title: str

@router.patch("/{patient_id}/cancer-images/{image_id}", response_model=CancerImageResponse)
def rename_patient_cancer_image(
    patient_id: int,
    image_id: int,
    payload: CancerImageRename,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    """Rename the title/label of a cancer image."""
    img = db.query(PatientCancerImage).filter(
        PatientCancerImage.id == image_id,
        PatientCancerImage.patient_id == patient_id,
    ).first()
    if not img:
        raise HTTPException(status_code=404, detail="Cancer image not found.")
    img.title = payload.title.strip() or img.title
    db.commit()
    db.refresh(img)
    return img
