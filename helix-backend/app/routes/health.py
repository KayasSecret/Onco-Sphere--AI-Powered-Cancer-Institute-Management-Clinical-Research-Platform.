from fastapi import APIRouter
from app.config.settings import settings

router = APIRouter()


@router.get("/health", tags=["System"])
def health_check():
    """
    Health-check endpoint — confirms the API is reachable and returns
    basic environment metadata. Used by the frontend Phase 0 round-trip
    and by any future load-balancer / uptime-monitor probes.
    """
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }
