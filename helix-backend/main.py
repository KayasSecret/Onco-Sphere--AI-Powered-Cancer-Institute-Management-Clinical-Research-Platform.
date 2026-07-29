from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import logging
import os

from app.config.settings import settings

# ── Structured logging setup ───────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO if settings.ENVIRONMENT == "production" else logging.DEBUG,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
# Suppress noisy third-party logs in production
logging.getLogger("aiosmtplib").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.engine").setLevel(
    logging.WARNING if settings.ENVIRONMENT == "production" else logging.INFO
)

from app.models import report_generator
from app.models import researcher_profile, researcher_draft  # register new models with ORM
from app.database.db import create_tables
from app.routes.health import router as health_router
from app.routes.auth import router as auth_router
from app.routes.dashboard import router as dashboard_router
from app.routes.patients import router as patients_router
from app.routes.upload import router as upload_router
from app.routes.users import router as users_router
from app.routes.report_generator import router as report_generator_router
from app.routes.researcher import router as researcher_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle handler."""
    # Create all ORM-defined tables (idempotent — safe to call on every boot)
    create_tables()
    
    # Database migration safety hooks: ensure columns exist in SQLite
    from sqlalchemy import text
    from app.database.db import SessionLocal
    db = SessionLocal()
    
    # 1. 'is_approved' column
    try:
        db.execute(text("SELECT is_approved FROM users LIMIT 1"))
    except Exception:
        db.rollback()
        try:
            db.execute(text("ALTER TABLE users ADD COLUMN is_approved VARCHAR(50) DEFAULT 'APPROVED' NOT NULL"))
            db.commit()
            print("\n[MIGRATION SUCCESS] Column 'is_approved' added to 'users' table.\n")
        except Exception as e:
            db.rollback()
            print(f"\n[MIGRATION ERROR] Failed to add column 'is_approved': {e}\n")

    # 2. 'registration_reason' column
    try:
        db.execute(text("SELECT registration_reason FROM users LIMIT 1"))
    except Exception:
        db.rollback()
        try:
            db.execute(text("ALTER TABLE users ADD COLUMN registration_reason TEXT"))
            db.commit()
            print("\n[MIGRATION SUCCESS] Column 'registration_reason' added to 'users' table.\n")
        except Exception as e:
            db.rollback()
            print(f"\n[MIGRATION ERROR] Failed to add column 'registration_reason': {e}\n")

    # 3. 'reset_otp' and 'reset_otp_expires_at' columns
    try:
        db.execute(text("SELECT reset_otp FROM users LIMIT 1"))
    except Exception:
        db.rollback()
        try:
            db.execute(text("ALTER TABLE users ADD COLUMN reset_otp VARCHAR(10)"))
            db.execute(text("ALTER TABLE users ADD COLUMN reset_otp_expires_at DATETIME"))
            db.commit()
            print("\n[MIGRATION SUCCESS] Columns 'reset_otp' and 'reset_otp_expires_at' added to 'users' table.\n")
        except Exception as e:
            db.rollback()
            print(f"\n[MIGRATION ERROR] Failed to add reset_otp columns: {e}\n")
            
    finally:
        db.close()
        
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="HELIX Oncology Intelligence Platform — REST API",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:4173",   # Vite preview
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers — all mounted under /api/v1
# ---------------------------------------------------------------------------
API_PREFIX = "/api/v1"

app.include_router(health_router,            prefix=API_PREFIX)
app.include_router(auth_router,              prefix=API_PREFIX)
app.include_router(dashboard_router,         prefix=API_PREFIX)
app.include_router(patients_router,          prefix=API_PREFIX)
app.include_router(upload_router,            prefix=API_PREFIX)
app.include_router(users_router,             prefix=API_PREFIX)
app.include_router(report_generator_router,  prefix=API_PREFIX)
app.include_router(researcher_router,        prefix=API_PREFIX)

# Create and mount static directory for local file uploads fallback
static_path = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_path, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_path), name="static")


# ---------------------------------------------------------------------------
# Root
# ---------------------------------------------------------------------------
@app.get("/", include_in_schema=False)
def root():
    return {
        "message": "HELIX API",
        "docs": "/api/docs",
        "version": settings.APP_VERSION,
    }
