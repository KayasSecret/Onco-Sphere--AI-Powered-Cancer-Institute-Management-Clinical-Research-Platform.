import re
from typing import List, Optional, Any
from datetime import datetime, date
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.user import UserRole
from app.models.visit import (
    Visit, VisitType, VisitStatus,
    VisitSymptom, VisitInvestigation, InvestigationStatus,
    VisitPrescription, VisitTreatment, VisitFollowUp,
)
from app.middleware.auth import require_roles, get_current_user

router = APIRouter(prefix="/visits", tags=["Visits"])


# ─────────────────────────────────────────────────────────────────────────────
# Visit Code Generator
# ─────────────────────────────────────────────────────────────────────────────

def generate_visit_code(db: Session) -> str:
    """
    Generates a sequential, unique visit code in the format 'VST-{YEAR}-{6-digit-zero-padded}'.
    e.g. VST-2026-000001, VST-2026-000002, ...
    Scans existing visit codes for the current year and increments from the max.
    """
    current_year = datetime.now().year
    prefix = f"VST-{current_year}-"

    existing_codes = (
        db.query(Visit.visit_code)
        .filter(Visit.visit_code.like(f"{prefix}%"))
        .all()
    )

    max_num = 0
    for (code,) in existing_codes:
        if code:
            match = re.search(rf"VST-{current_year}-(\d+)", code)
            if match:
                num = int(match.group(1))
                if num > max_num:
                    max_num = num

    next_num = max_num + 1
    visit_code = f"{prefix}{next_num:06d}"

    # Fallback uniqueness check
    while db.query(Visit).filter(Visit.visit_code == visit_code).first():
        next_num += 1
        visit_code = f"{prefix}{next_num:06d}"

    return visit_code


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic Schemas — Visit
# ─────────────────────────────────────────────────────────────────────────────

class VisitCreate(BaseModel):
    patient_id: int
    doctor_id: Optional[int] = None
    doctor_name: Optional[str] = None
    department: str
    visit_type: VisitType
    scheduled_at: datetime
    notes: Optional[str] = None


class VisitListItem(BaseModel):
    id: int
    visit_code: str
    patient_id: int
    doctor_id: Optional[int] = None
    doctor_name: Optional[str] = None
    department: str
    visit_type: VisitType
    status: VisitStatus
    scheduled_at: datetime
    checked_in_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class VisitResponse(BaseModel):
    id: int
    visit_code: str
    patient_id: int
    doctor_id: Optional[int] = None
    doctor_name: Optional[str] = None
    department: str
    visit_type: VisitType
    status: VisitStatus
    scheduled_at: datetime
    checked_in_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_by_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StatusUpdate(BaseModel):
    status: VisitStatus


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic Schemas — Symptoms
# ─────────────────────────────────────────────────────────────────────────────

class SymptomCreate(BaseModel):
    name: str
    severity_score: Optional[int] = None   # 0-10
    severity_label: Optional[str] = None   # Mild / Moderate / Severe
    patient_note: Optional[str] = None
    recorded_by_role: Optional[str] = None


class SymptomResponse(BaseModel):
    id: int
    visit_id: int
    name: str
    severity_score: Optional[int] = None
    severity_label: Optional[str] = None
    patient_note: Optional[str] = None
    recorded_by_role: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic Schemas — Investigations
# ─────────────────────────────────────────────────────────────────────────────

class InvestigationCreate(BaseModel):
    name: str
    status: InvestigationStatus = InvestigationStatus.ORDERED
    result_url: Optional[str] = None


class InvestigationResponse(BaseModel):
    id: int
    visit_id: int
    name: str
    status: InvestigationStatus
    ordered_at: datetime
    result_url: Optional[str] = None

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic Schemas — Prescriptions
# ─────────────────────────────────────────────────────────────────────────────

class PrescriptionCreate(BaseModel):
    medicines: List[Any]   # [{name, dose, frequency, duration}]
    instructions: Optional[str] = None
    prescribing_doctor_id: Optional[int] = None
    prescribing_doctor_name: Optional[str] = None


class PrescriptionResponse(BaseModel):
    id: int
    visit_id: int
    medicines: List[Any]
    instructions: Optional[str] = None
    prescribing_doctor_id: Optional[int] = None
    prescribing_doctor_name: Optional[str] = None
    prescribed_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic Schemas — Treatments
# ─────────────────────────────────────────────────────────────────────────────

class TreatmentCreate(BaseModel):
    procedure_type: str   # e.g. "Chemotherapy — Cycle 4"
    notes: Optional[str] = None
    performed_by_name: Optional[str] = None


class TreatmentResponse(BaseModel):
    id: int
    visit_id: int
    procedure_type: str
    notes: Optional[str] = None
    performed_by_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic Schemas — Follow-up
# ─────────────────────────────────────────────────────────────────────────────

class FollowUpCreate(BaseModel):
    advice_text: Optional[str] = None
    next_visit_id: Optional[int] = None
    next_appointment_note: Optional[str] = None


class FollowUpResponse(BaseModel):
    id: int
    visit_id: int
    advice_text: Optional[str] = None
    next_visit_id: Optional[int] = None
    next_appointment_note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# Helper — assert visit exists
# ─────────────────────────────────────────────────────────────────────────────

def _get_visit_or_404(visit_id: int, db: Session) -> Visit:
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visit not found.",
        )
    return visit


# ─────────────────────────────────────────────────────────────────────────────
# Routes — Core Visit CRUD
# ─────────────────────────────────────────────────────────────────────────────

@router.get("", response_model=dict)
def list_visits(
    patient_id: Optional[int] = Query(None),
    status_filter: Optional[VisitStatus] = Query(None, alias="status"),
    visit_type: Optional[VisitType] = Query(None),
    doctor_id: Optional[int] = Query(None),
    department: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    List visits with optional filters.
    Supports patient_id, status, visit_type, doctor_id, department, date range, and pagination.
    Available to all authenticated users.
    """
    query = db.query(Visit)

    if patient_id is not None:
        query = query.filter(Visit.patient_id == patient_id)
    if status_filter is not None:
        query = query.filter(Visit.status == status_filter)
    if visit_type is not None:
        query = query.filter(Visit.visit_type == visit_type)
    if doctor_id is not None:
        query = query.filter(Visit.doctor_id == doctor_id)
    if department is not None:
        query = query.filter(Visit.department == department)
    if date_from is not None:
        query = query.filter(Visit.scheduled_at >= date_from)
    if date_to is not None:
        query = query.filter(Visit.scheduled_at <= date_to)

    total = query.count()
    visits = (
        query.order_by(Visit.scheduled_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return {
        "items": [VisitListItem.model_validate(v) for v in visits],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@router.post("", response_model=VisitResponse, status_code=status.HTTP_201_CREATED)
def create_visit(
    payload: VisitCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    """
    Create a new visit record.
    Automatically generates a sequential visit code (e.g. VST-2026-000001).
    Requires ADMIN or SUPER_ADMIN role.
    """
    visit_code = generate_visit_code(db)

    new_visit = Visit(
        visit_code=visit_code,
        created_by_id=current_user.id,
        **payload.model_dump(),
    )
    db.add(new_visit)
    db.commit()
    db.refresh(new_visit)
    return new_visit


@router.get("/patient/{patient_id}", response_model=List[VisitListItem])
def list_visits_for_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Retrieve all visits for a specific patient, ordered by scheduled date descending.
    Available to all authenticated users.
    """
    visits = (
        db.query(Visit)
        .filter(Visit.patient_id == patient_id)
        .order_by(Visit.scheduled_at.desc())
        .all()
    )
    return visits


@router.get("/{visit_id}", response_model=VisitResponse)
def get_visit_detail(
    visit_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Retrieve full detail for a single visit. Available to all authenticated users."""
    return _get_visit_or_404(visit_id, db)


@router.patch("/{visit_id}/status", response_model=VisitResponse)
def update_visit_status(
    visit_id: int,
    payload: StatusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    """
    Update the status of a visit.
    Requires ADMIN or SUPER_ADMIN role.
    """
    visit = _get_visit_or_404(visit_id, db)
    visit.status = payload.status
    try:
        db.commit()
        db.refresh(visit)
        return visit
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update visit status: {str(e)}",
        )


@router.post("/{visit_id}/check-in", response_model=VisitResponse)
def check_in_visit(
    visit_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    """
    Mark a visit as checked-in and record the check-in timestamp.
    Requires ADMIN or SUPER_ADMIN role.
    """
    visit = _get_visit_or_404(visit_id, db)

    if visit.status not in (VisitStatus.SCHEDULED, VisitStatus.CHECKED_IN):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot check in a visit with status '{visit.status.value}'.",
        )

    visit.status = VisitStatus.CHECKED_IN
    visit.checked_in_at = datetime.now()
    try:
        db.commit()
        db.refresh(visit)
        return visit
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to check in visit: {str(e)}",
        )


# ─────────────────────────────────────────────────────────────────────────────
# Routes — Symptoms
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{visit_id}/symptoms", response_model=List[SymptomResponse])
def list_visit_symptoms(
    visit_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Retrieve all symptoms recorded for a visit. Available to all authenticated users."""
    _get_visit_or_404(visit_id, db)
    symptoms = (
        db.query(VisitSymptom)
        .filter(VisitSymptom.visit_id == visit_id)
        .order_by(VisitSymptom.created_at.asc())
        .all()
    )
    return symptoms


@router.post("/{visit_id}/symptoms", response_model=SymptomResponse, status_code=status.HTTP_201_CREATED)
def add_visit_symptom(
    visit_id: int,
    payload: SymptomCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    """
    Add a symptom record to a visit.
    Requires ADMIN or SUPER_ADMIN role.
    """
    _get_visit_or_404(visit_id, db)
    new_symptom = VisitSymptom(visit_id=visit_id, **payload.model_dump())
    db.add(new_symptom)
    db.commit()
    db.refresh(new_symptom)
    return new_symptom


# ─────────────────────────────────────────────────────────────────────────────
# Routes — Investigations
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{visit_id}/investigations", response_model=List[InvestigationResponse])
def list_visit_investigations(
    visit_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Retrieve all investigations ordered for a visit. Available to all authenticated users."""
    _get_visit_or_404(visit_id, db)
    investigations = (
        db.query(VisitInvestigation)
        .filter(VisitInvestigation.visit_id == visit_id)
        .order_by(VisitInvestigation.ordered_at.asc())
        .all()
    )
    return investigations


@router.post("/{visit_id}/investigations", response_model=InvestigationResponse, status_code=status.HTTP_201_CREATED)
def add_visit_investigation(
    visit_id: int,
    payload: InvestigationCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    """
    Add an investigation order to a visit.
    Requires ADMIN or SUPER_ADMIN role.
    """
    _get_visit_or_404(visit_id, db)
    new_inv = VisitInvestigation(visit_id=visit_id, **payload.model_dump())
    db.add(new_inv)
    db.commit()
    db.refresh(new_inv)
    return new_inv


# ─────────────────────────────────────────────────────────────────────────────
# Routes — Prescriptions
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{visit_id}/prescriptions", response_model=List[PrescriptionResponse])
def list_visit_prescriptions(
    visit_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Retrieve all prescriptions for a visit. Available to all authenticated users."""
    _get_visit_or_404(visit_id, db)
    prescriptions = (
        db.query(VisitPrescription)
        .filter(VisitPrescription.visit_id == visit_id)
        .order_by(VisitPrescription.prescribed_at.desc())
        .all()
    )
    return prescriptions


@router.post("/{visit_id}/prescriptions", response_model=PrescriptionResponse, status_code=status.HTTP_201_CREATED)
def add_visit_prescription(
    visit_id: int,
    payload: PrescriptionCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    """
    Add a prescription to a visit.
    Requires ADMIN or SUPER_ADMIN role.
    """
    _get_visit_or_404(visit_id, db)

    # Auto-populate prescribing doctor from authenticated user if not provided
    doctor_id = payload.prescribing_doctor_id or current_user.id
    doctor_name = payload.prescribing_doctor_name or current_user.full_name

    new_prescription = VisitPrescription(
        visit_id=visit_id,
        medicines=payload.medicines,
        instructions=payload.instructions,
        prescribing_doctor_id=doctor_id,
        prescribing_doctor_name=doctor_name,
    )
    db.add(new_prescription)
    db.commit()
    db.refresh(new_prescription)
    return new_prescription


# ─────────────────────────────────────────────────────────────────────────────
# Routes — Treatments
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{visit_id}/treatments", response_model=List[TreatmentResponse])
def list_visit_treatments(
    visit_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Retrieve all treatment records for a visit. Available to all authenticated users."""
    _get_visit_or_404(visit_id, db)
    treatments = (
        db.query(VisitTreatment)
        .filter(VisitTreatment.visit_id == visit_id)
        .order_by(VisitTreatment.created_at.asc())
        .all()
    )
    return treatments


@router.post("/{visit_id}/treatments", response_model=TreatmentResponse, status_code=status.HTTP_201_CREATED)
def add_visit_treatment(
    visit_id: int,
    payload: TreatmentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    """
    Record a treatment performed during a visit.
    Requires ADMIN or SUPER_ADMIN role.
    """
    _get_visit_or_404(visit_id, db)
    new_treatment = VisitTreatment(visit_id=visit_id, **payload.model_dump())
    db.add(new_treatment)
    db.commit()
    db.refresh(new_treatment)
    return new_treatment


# ─────────────────────────────────────────────────────────────────────────────
# Routes — Follow-up
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{visit_id}/followup", response_model=Optional[FollowUpResponse])
def get_visit_followup(
    visit_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Retrieve the follow-up record for a visit (one-to-one).
    Returns null if no follow-up has been set yet.
    Available to all authenticated users.
    """
    _get_visit_or_404(visit_id, db)
    followup = db.query(VisitFollowUp).filter(VisitFollowUp.visit_id == visit_id).first()
    return followup


@router.post("/{visit_id}/followup", response_model=FollowUpResponse, status_code=status.HTTP_201_CREATED)
def set_visit_followup(
    visit_id: int,
    payload: FollowUpCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    """
    Create or replace the follow-up record for a visit.
    If a follow-up already exists for this visit, it is updated in-place.
    Requires ADMIN or SUPER_ADMIN role.
    """
    _get_visit_or_404(visit_id, db)

    existing = db.query(VisitFollowUp).filter(VisitFollowUp.visit_id == visit_id).first()
    if existing:
        # Update existing follow-up in-place
        for key, value in payload.model_dump().items():
            setattr(existing, key, value)
        try:
            db.commit()
            db.refresh(existing)
            return existing
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to update follow-up: {str(e)}",
            )

    new_followup = VisitFollowUp(visit_id=visit_id, **payload.model_dump())
    db.add(new_followup)
    db.commit()
    db.refresh(new_followup)
    return new_followup


# ─────────────────────────────────────────────────────────────────────────────
# Route — Delete Visit
# ─────────────────────────────────────────────────────────────────────────────

@router.delete("/{visit_id}", status_code=status.HTTP_200_OK)
def delete_visit(
    visit_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    """
    Delete a visit record and its associated clinical notes/sub-resources.
    Requires ADMIN or SUPER_ADMIN role.
    """
    visit = _get_visit_or_404(visit_id, db)
    db.query(VisitSymptom).filter(VisitSymptom.visit_id == visit_id).delete()
    db.query(VisitInvestigation).filter(VisitInvestigation.visit_id == visit_id).delete()
    db.query(VisitPrescription).filter(VisitPrescription.visit_id == visit_id).delete()
    db.query(VisitTreatment).filter(VisitTreatment.visit_id == visit_id).delete()
    db.query(VisitFollowUp).filter(VisitFollowUp.visit_id == visit_id).delete()
    db.delete(visit)
    db.commit()
    return {"message": "Visit deleted successfully", "id": visit_id}

