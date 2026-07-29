"""
HELIX Seed Script
Initializes database tables and seeds the primary Super Admin account if not present.

Usage:
  cd helix-backend
  python seed.py
"""
import os
import sys

# Ensure the backend package is importable
sys.path.insert(0, os.path.dirname(__file__))

# Import all models to register ORM mappings with SQLAlchemy
import app.models.researcher_profile  # noqa: F401
import app.models.researcher_draft    # noqa: F401
import app.models.report_generator    # noqa: F401
from app.database.db import SessionLocal, create_tables
from app.models.user import User, UserRole
from app.utils.password import hash_password


def seed():
    print("[Helix Database] Ensuring database tables exist...")
    create_tables()

    db = SessionLocal()
    try:
        # Check if Super Admin exists
        super_admin = db.query(User).filter(User.role == UserRole.SUPER_ADMIN).first()
        if not super_admin:
            print("[Helix Database] Seeding initial Super Admin account...")
            super_admin = User(
                full_name="Chhavi Gautam",
                email="chhavigautamk16@gmail.com",
                password_hash=hash_password("Helix@SuperAdmin1"),
                role=UserRole.SUPER_ADMIN,
                is_active=True,
                is_approved="APPROVED",
            )
            db.add(super_admin)
            db.commit()
            print("   + Created Super Admin: chhavigautamk16@gmail.com")
        else:
            print(f"   -> Super Admin already exists: {super_admin.email} ({super_admin.full_name})")

        print("[Helix Database] Initial database check complete.")

    except Exception as e:
        db.rollback()
        print(f"[Helix Database] Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
