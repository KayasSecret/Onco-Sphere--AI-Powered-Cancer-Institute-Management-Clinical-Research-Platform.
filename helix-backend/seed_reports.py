"""
HELIX Seed Reports Script
Initializes report generator schema, default Oxidative Stress template,
institute branding info, and doctor signature.

Usage:
  cd helix-backend
  python seed_reports.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import ORM models to register mappings with SQLAlchemy
import app.models.researcher_profile  # noqa: F401
import app.models.researcher_draft    # noqa: F401

from app.database.db import SessionLocal, create_tables
from app.models.report_generator import ReportTemplate, ReportParameter, InstituteInfo, DoctorSignature


def seed_reports_schema():
    create_tables()

    db = SessionLocal()
    try:
        # 1. Seed Template: Oxidative Stress Report
        template = db.query(ReportTemplate).filter(ReportTemplate.code == "OXIDATIVE_STRESS").first()
        if not template:
            template = ReportTemplate(
                name="Oxidative Stress Report",
                code="OXIDATIVE_STRESS",
                description="This includes markers that show cellular injury caused by reactive species. MDA (TBARS) and FOX-2 indicate lipid peroxidation and early membrane damage. Protein Carbonyl (DNPH) reflects oxidative modification of proteins. Nitric Oxide (Griess assay) indicates nitrosative stress, which can contribute to tissue and cellular damage. Elevated values of these markers suggest increased oxidative stress in the body.",
                default_disclaimer="The information provided by this panel reflects biochemical markers of oxidative balance and is intended for research or monitoring purposes. It should be considered alongside clinical evaluation and not as a standalone diagnostic tool."
            )
            db.add(template)
            db.commit()
            db.refresh(template)
            print("Seeded Report Template: Oxidative Stress Report")
        else:
            print("Template 'OXIDATIVE_STRESS' already exists.")

        # 2. Seed Parameters for Oxidative Stress template
        parameters = [
            {
                "name": "Total Lipid Hydroperoxidise (FOX 2)",
                "code": "FOX2",
                "section": "Oxidative Damage",
                "reference_range": "2.0 - 10",
                "default_interpretation": "Early Stage Lipid Damage",
                "unit": "μmol/L",
                "display_order": 1
            },
            {
                "name": "Lipid Peroxidation (MDA)",
                "code": "MDA",
                "section": "Oxidative Damage",
                "reference_range": "0.5 - 2.0",
                "default_interpretation": "Late Stage Lipid Damage",
                "unit": "nmol/mL",
                "display_order": 2
            },
            {
                "name": "Reactive Nitrogen Species (Griess)",
                "code": "GRIESS",
                "section": "Oxidative Damage",
                "reference_range": "20 - 40",
                "default_interpretation": "Inflammatory Stage",
                "unit": "μmol/L",
                "display_order": 3
            },
            {
                "name": "Protein Oxidation (DNPH)",
                "code": "DNPH",
                "section": "Oxidative Damage",
                "reference_range": "0.5 - 2.5",
                "default_interpretation": "Protein Damage Stage",
                "unit": "nmol/mg",
                "display_order": 4
            },
            {
                "name": "Total Antioxidant Capacity (GSH+ TAC+ SOD+ Catalase+ FRAP+ ABTS)",
                "code": "TAC",
                "section": "Antioxidant Defence",
                "reference_range": "600 - 1200",
                "default_interpretation": "Defense System Marker",
                "unit": "μmol/L",
                "display_order": 5
            }
        ]

        for p_data in parameters:
            param = db.query(ReportParameter).filter(
                ReportParameter.template_id == template.id,
                ReportParameter.code == p_data["code"]
            ).first()
            if not param:
                param = ReportParameter(
                    template_id=template.id,
                    name=p_data["name"],
                    code=p_data["code"],
                    section=p_data["section"],
                    reference_range=p_data["reference_range"],
                    default_interpretation=p_data["default_interpretation"],
                    unit=p_data["unit"],
                    display_order=p_data["display_order"]
                )
                db.add(param)
                print(f"Seeded Parameter: {p_data['name']}")

        db.commit()

        # 3. Seed Institute Info
        inst = db.query(InstituteInfo).first()
        if not inst:
            inst = InstituteInfo(
                name="INSTITUTE OF CANCER AND STEM CELL RESEARCH",
                logo_url="/static/default_logo.png",
                stamp_url="/static/default_stamp.png",
                address="M4 Mishika Tower Sampna Sangeeta Indore M.P. 452001",
                website="www.icsrofficial.com",
                email="icsrofficial@gmail.com",
                contact_number="+91 7582950349"
            )
            db.add(inst)
            db.commit()
            print("Seeded default Institute details.")
        else:
            print("Institute info already exists.")

        # 4. Seed Doctor Signature
        doc = db.query(DoctorSignature).filter(DoctorSignature.doctor_name == "Dr. Somani").first()
        if not doc:
            doc = DoctorSignature(
                doctor_name="Dr. Somani",
                signature_url="/static/default_signature.png",
                is_active=True
            )
            db.add(doc)
            db.commit()
            print("Seeded default Doctor signature.")
        else:
            print("Doctor signature already exists.")

    except Exception as e:
        print(f"Error seeding report data: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_reports_schema()
