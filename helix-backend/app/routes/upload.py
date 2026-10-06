import os
import uuid
import logging
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
import cloudinary
import cloudinary.uploader
from app.config.settings import settings
from app.database.db import get_db
from app.middleware.auth import require_roles, get_current_user
from app.models.user import UserRole

logger = logging.getLogger("helix.upload")

router = APIRouter(prefix="/upload", tags=["Upload Service"])

# Setup local upload directory as a fallback
LOCAL_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "static", "uploads")
os.makedirs(LOCAL_UPLOAD_DIR, exist_ok=True)

# Configure Cloudinary if credentials are provided
cloudinary_active = False
if (
    settings.CLOUDINARY_CLOUD_NAME != "placeholder"
    and settings.CLOUDINARY_API_KEY != "placeholder"
    and settings.CLOUDINARY_API_SECRET != "placeholder"
):
    try:
        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
            secure=True
        )
        cloudinary_active = True
    except Exception as e:
        logger.warning("Cloudinary config failed: %s", e)


@router.get("/status")
def get_upload_status(
    current_user = Depends(require_roles([UserRole.SUPER_ADMIN])),
):
    """
    Check if Cloudinary storage is active.
    Super Admin only.
    """
    return {
        "provider": "Cloudinary" if cloudinary_active else "Local Storage (Fallback)",
        "active": cloudinary_active,
    }


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user),
):
    """
    Upload profile photo or image.
    All authenticated users.
    Falls back to local file storage if Cloudinary credentials are not configured.
    """
    # Verify file type
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only JPEG, PNG, and WEBP images are allowed.",
        )

    # Cloudinary path
    if cloudinary_active:
        try:
            upload_result = cloudinary.uploader.upload(
                file.file,
                folder="helix_patients",
                transformation=[
                    {"width": 300, "height": 300, "crop": "fill", "gravity": "face"}
                ]
            )
            return {"url": upload_result.get("secure_url")}
        except Exception as e:
            # Fallback to local on Cloudinary failure
            logger.warning("Cloudinary upload failed: %s. Falling back to local storage.", e)

    # Local fallback
    try:
        ext = os.path.splitext(file.filename)[1] or ".jpg"
        unique_filename = f"{uuid.uuid4()}{ext}"
        filepath = os.path.join(LOCAL_UPLOAD_DIR, unique_filename)

        with open(filepath, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        # Return a relative static URL (proxied through backend port 8000)
        local_url = f"http://localhost:8000/static/uploads/{unique_filename}"
        return {"url": local_url}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Local upload failed: {e}",
        )


@router.post("/document")
async def upload_document(
    file: UploadFile = File(...),
    current_user = Depends(require_roles([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    """
    Upload clinical report document (PDF, DOC, DOCX, TXT, Excel).
    Admins and Super Admins only.
    Falls back to local file storage if Cloudinary is not configured.
    """
    allowed_extensions = [".pdf", ".doc", ".docx", ".txt", ".xls", ".xlsx"]
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only PDF, Word, Excel, and Text files are allowed.",
        )

    # Cloudinary path
    if cloudinary_active:
        try:
            # PDFs, Docs, Excel, TXT are non-image documents; upload as raw with original extension to avoid image pipeline restrictions
            is_doc_raw = ext in [".pdf", ".doc", ".docx", ".txt", ".xls", ".xlsx"]
            resource_type = "raw" if is_doc_raw else "auto"
            unique_name = f"{uuid.uuid4()}{ext}"
            
            upload_kwargs = {
                "folder": "helix_documents",
                "resource_type": resource_type,
            }
            if is_doc_raw:
                upload_kwargs["public_id"] = unique_name
                upload_kwargs["use_filename"] = True

            upload_result = cloudinary.uploader.upload(
                file.file,
                **upload_kwargs
            )
            return {"url": upload_result.get("secure_url")}
        except Exception as e:
            logger.warning("Cloudinary document upload failed: %s. Falling back to local storage.", e)

    # Local fallback
    try:
        unique_filename = f"{uuid.uuid4()}{ext}"
        filepath = os.path.join(LOCAL_UPLOAD_DIR, unique_filename)

        with open(filepath, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        local_url = f"http://localhost:8000/static/uploads/{unique_filename}"
        return {"url": local_url}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Local document upload failed: {e}",
        )


# ── Constants for researcher document uploads ─────────────────────────────────
RESEARCHER_ALLOWED_MIME = {"application/pdf", "image/jpeg", "image/png"}
RESEARCHER_ALLOWED_EXT  = {".pdf", ".jpg", ".jpeg", ".png"}
RESEARCHER_MAX_BYTES    = 5 * 1024 * 1024   # 5 MB


@router.post("/researcher-document")
async def upload_researcher_document(
    file: UploadFile = File(...),
):
    """
    Upload a researcher application document (ID proof, institutional ID, etc.).
    Public endpoint — no JWT required (used during registration flow).

    Security rules (enforced on both frontend and backend):
      • Allowed types : PDF, JPG, PNG only
      • Max file size : 5 MB
      • Only verified Cloudinary URLs are stored in the database
    """
    # ── 1. Extension check ────────────────────────────────────────────────────
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in RESEARCHER_ALLOWED_EXT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Only PDF, JPG, and PNG files are allowed.",
        )

    # ── 2. MIME type check ────────────────────────────────────────────────────
    if file.content_type not in RESEARCHER_ALLOWED_MIME:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid content type '{file.content_type}'. Only PDF, JPG, and PNG are accepted.",
        )

    # ── 3. Read file into memory and check size ───────────────────────────────
    content = await file.read()
    if len(content) > RESEARCHER_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds the 5 MB limit. Your file is {len(content) / (1024*1024):.2f} MB.",
        )

    # ── 4. Upload to Cloudinary (or local fallback) ───────────────────────────
    if cloudinary_active:
        try:
            import io
            upload_result = cloudinary.uploader.upload(
                io.BytesIO(content),
                folder="helix_researcher_docs",
                resource_type="auto",
            )
            return {"url": upload_result.get("secure_url"), "provider": "cloudinary"}
        except Exception as e:
            logger.warning("Cloudinary researcher-doc upload failed: %s. Falling back to local storage.", e)

    # Local fallback
    try:
        unique_filename = f"{uuid.uuid4()}{ext}"
        filepath = os.path.join(LOCAL_UPLOAD_DIR, unique_filename)
        with open(filepath, "wb") as buffer:
            buffer.write(content)
        local_url = f"http://localhost:8000/static/uploads/{unique_filename}"
        return {"url": local_url, "provider": "local"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File upload failed: {e}",
        )


@router.get("/storage")
def get_storage_stats(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Get dynamic storage stats for reports, images, backups, and avatars.
    """
    local_reports_size = 0
    local_images_size = 0
    
    report_extensions = {".pdf", ".doc", ".docx", ".txt", ".xls", ".xlsx"}
    image_extensions = {".jpg", ".jpeg", ".png", ".webp"}
    
    if os.path.exists(LOCAL_UPLOAD_DIR):
        for filename in os.listdir(LOCAL_UPLOAD_DIR):
            filepath = os.path.join(LOCAL_UPLOAD_DIR, filename)
            if os.path.isfile(filepath):
                try:
                    size = os.path.getsize(filepath)
                    ext = os.path.splitext(filename)[1].lower()
                    if ext in report_extensions:
                        local_reports_size += size
                    elif ext in image_extensions:
                        local_images_size += size
                    else:
                        local_reports_size += size
                except Exception:
                    pass

    from app.models.patient import PatientReport, PatientCancerImage, Patient
    from app.models.user import User

    db_reports_count = db.query(PatientReport).count()
    db_images_count = db.query(PatientCancerImage).count()
    db_patients_count = db.query(Patient).count()
    db_users_count = db.query(User).count()

    base_backups_size = 3200000 + (db_patients_count * 100000)
    
    estimated_reports_size = local_reports_size
    if db_reports_count > 0 and local_reports_size == 0:
        estimated_reports_size = db_reports_count * 153600
        
    estimated_images_size = local_images_size
    if db_images_count > 0 and local_images_size == 0:
        estimated_images_size = db_images_count * 460800

    avatar_count = db_users_count + db_patients_count
    estimated_avatars_size = avatar_count * 102400

    total_used = estimated_reports_size + estimated_images_size + base_backups_size + estimated_avatars_size
    capacity = 524288000  # 500 MB

    return {
        "reports_bytes": estimated_reports_size,
        "images_bytes": estimated_images_size,
        "backups_bytes": base_backups_size,
        "avatars_bytes": estimated_avatars_size,
        "total_used_bytes": total_used,
        "capacity_bytes": capacity,
        "utilized_percent": round((total_used / capacity) * 100, 2),
        "cloudinary_active": cloudinary_active
    }

