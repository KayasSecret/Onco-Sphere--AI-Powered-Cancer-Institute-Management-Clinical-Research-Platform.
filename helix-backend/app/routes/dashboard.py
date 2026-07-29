from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.db import get_db
from app.middleware.auth import get_current_user
from app.models.user import User, UserRole
from app.models.patient import Patient, TreatmentStatus

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Aggregate KPI statistics and cancer site distributions for the Command Dashboard.
    """
    # User counts
    total_admins = db.query(User).filter(
        User.role == UserRole.ADMIN, User.is_active == True
    ).count()
    total_students = db.query(User).filter(
        User.role == UserRole.STUDENT, User.is_active == True
    ).count()

    # Patient counts
    total_patients = db.query(Patient).count()
    
    # Registrations with today's admission date
    today_registrations = db.query(Patient).filter(
        Patient.admission_date == date.today()
    ).count()
    
    # Active treatments (Under Treatment status)
    active_treatments = db.query(Patient).filter(
        Patient.treatment_status == TreatmentStatus.UNDER_TREATMENT
    ).count()

    # Cancer type distribution (group by cancer_type_site)
    cancer_distribution = db.query(
        Patient.cancer_type_site,
        func.count(Patient.id)
    ).group_by(Patient.cancer_type_site).all()

    distribution_data = [
        {"cancer_type": site if site else "Unknown", "count": count}
        for site, count in cancer_distribution
    ]

    return {
        "total_patients": total_patients,
        "today_registrations": today_registrations,
        "active_treatments": active_treatments,
        "total_admins": total_admins,
        "total_students": total_students,
        "cancer_distribution": distribution_data,
    }

