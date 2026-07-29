"""
app/services/email_service.py
──────────────────────────────────────────────────────────────────────────────
Production-grade async email service for Onco Sphere.

Design principles:
  • Non-blocking — all sends run as FastAPI BackgroundTasks (never block API)
  • Retry logic — exponential backoff (configurable via settings)
  • Structured logging — every event is logged with context
  • Never raises — email failures are caught and logged; main flow is unaffected
  • Config-driven — SMTP host/port/subjects from environment; nothing hardcoded
  • Template-based — Jinja2 HTML templates for professional branded emails

Usage in routes:
    background_tasks.add_task(email_service.send_registration_confirmation, ...)
    background_tasks.add_task(email_service.send_otp_email, ...)
    background_tasks.add_task(email_service.send_approval_email, ...)
    background_tasks.add_task(email_service.send_rejection_email, ...)
──────────────────────────────────────────────────────────────────────────────
"""
from __future__ import annotations

import asyncio
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Any, Dict, Optional

import aiosmtplib
from jinja2 import Environment, FileSystemLoader, TemplateNotFound, select_autoescape

from app.config.settings import settings

# ── Structured logger ─────────────────────────────────────────────────────────
logger = logging.getLogger("onco_sphere.email")

# ── Template directory (relative to project root, resolved at import time) ────
_TEMPLATES_DIR = Path(__file__).parent.parent / "templates" / "emails"


# ──────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ──────────────────────────────────────────────────────────────────────────────

def _get_jinja_env() -> Environment:
    """Return a Jinja2 environment pointing at the email templates directory."""
    return Environment(
        loader=FileSystemLoader(str(_TEMPLATES_DIR)),
        autoescape=select_autoescape(["html", "xml"]),
        trim_blocks=True,
        lstrip_blocks=True,
    )


def _render_template(template_name: str, context: Dict[str, Any]) -> str:
    """
    Render a Jinja2 template to an HTML string.

    Raises:
        TemplateNotFound -- if the template file does not exist.
        jinja2.TemplateError -- if the template has a syntax/render error.
    """
    env = _get_jinja_env()
    template = env.get_template(template_name)
    return template.render(**context, settings=settings)


def _build_mime_message(
    to_email: str,
    subject: str,
    html_body: str,
    plain_text: Optional[str] = None,
) -> MIMEMultipart:
    """Build a MIME multipart/alternative message with optional plain-text fallback."""
    msg = MIMEMultipart("alternative")
    msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM}>"
    msg["To"] = to_email
    msg["Subject"] = subject

    if plain_text:
        msg.attach(MIMEText(plain_text, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))
    return msg


async def _send_with_retry(
    to_email: str,
    subject: str,
    html_body: str,
    plain_text: Optional[str] = None,
    event_label: str = "email",
) -> bool:
    """
    Send an email via aiosmtplib with exponential-backoff retry.

    Returns True on success, False when all attempts are exhausted.
    Never raises -- all exceptions are caught and logged.
    """
    max_retries: int = settings.EMAIL_MAX_RETRIES
    base_delay: float = settings.EMAIL_RETRY_BASE_DELAY

    # Guard: skip silently if SMTP is not configured
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD or not settings.EMAIL_FROM:
        logger.warning(
            "[EMAIL_SKIP] SMTP credentials not configured. "
            "Set SMTP_USER, SMTP_PASSWORD, EMAIL_FROM in .env. "
            "event=%s to=%s subject='%s'",
            event_label, to_email, subject,
        )
        return False

    msg = _build_mime_message(to_email, subject, html_body, plain_text)

    for attempt in range(1, max_retries + 1):
        try:
            logger.info(
                "[EMAIL_ATTEMPT] event=%s to=%s subject='%s' attempt=%d/%d",
                event_label, to_email, subject, attempt, max_retries,
            )
            await aiosmtplib.send(
                msg,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USER,
                password=settings.SMTP_PASSWORD,
                start_tls=True,
                timeout=10,
            )
            logger.info(
                "[EMAIL_SUCCESS] event=%s to=%s subject='%s' attempt=%d",
                event_label, to_email, subject, attempt,
            )
            return True

        except aiosmtplib.SMTPAuthenticationError as exc:
            # Auth errors are permanent -- do not retry
            logger.error(
                "[EMAIL_AUTH_ERROR] event=%s to=%s -- SMTP authentication failed. "
                "Check SMTP_USER / SMTP_PASSWORD in .env. error=%s",
                event_label, to_email, exc,
            )
            return False

        except (aiosmtplib.SMTPConnectError, aiosmtplib.SMTPTimeoutError, OSError) as exc:
            # Transient network / connection errors -- retry with backoff
            delay = base_delay * (2 ** (attempt - 1))
            if attempt < max_retries:
                logger.warning(
                    "[EMAIL_RETRY] event=%s to=%s attempt=%d/%d error=%s retry_in=%.1fs",
                    event_label, to_email, attempt, max_retries, exc, delay,
                )
                await asyncio.sleep(delay)
            else:
                logger.error(
                    "[EMAIL_FAILED] event=%s to=%s subject='%s' "
                    "all_%d_attempts_exhausted error=%s",
                    event_label, to_email, subject, max_retries, exc,
                    exc_info=True,
                )
                return False

        except Exception as exc:  # noqa: BLE001
            # Unexpected error -- log and abort
            logger.error(
                "[EMAIL_UNEXPECTED_ERROR] event=%s to=%s subject='%s' error=%s",
                event_label, to_email, subject, exc,
                exc_info=True,
            )
            return False

    return False


# ──────────────────────────────────────────────────────────────────────────────
# Public API -- one async function per email trigger
# Each is safe to call as a FastAPI BackgroundTask.
# All exceptions are handled internally; nothing propagates to the caller.
# ──────────────────────────────────────────────────────────────────────────────

async def send_registration_confirmation(
    user_email: str,
    user_name: str,
    institution: str = "N/A",
    researcher_role: str = "N/A",
    research_area: str = "N/A",
) -> None:
    """
    Send a registration confirmation email immediately after a researcher
    submits the 5-step application form.
    """
    event = "registration_confirmation"
    logger.info("[EMAIL_TRIGGER] event=%s to=%s", event, user_email)
    try:
        html = _render_template(
            "registration_confirmation.html",
            {
                "user_name": user_name,
                "user_email": user_email,
                "institution": institution,
                "researcher_role": researcher_role,
                "research_area": research_area,
                "login_url": f"{settings.FRONTEND_URL}/login",
            },
        )
        await _send_with_retry(
            to_email=user_email,
            subject=settings.EMAIL_SUBJECT_REGISTRATION,
            html_body=html,
            event_label=event,
        )
    except TemplateNotFound as exc:
        logger.error("[EMAIL_TEMPLATE_MISSING] event=%s template=%s", event, exc)
    except Exception as exc:  # noqa: BLE001
        logger.error("[EMAIL_ERROR] event=%s to=%s error=%s", event, user_email, exc, exc_info=True)


async def send_otp_email(
    user_email: str,
    otp_code: str,
    expiry_minutes: int = 10,
) -> None:
    """
    Send an OTP verification code so the researcher can securely resume their draft.
    """
    event = "otp_verification"
    logger.info("[EMAIL_TRIGGER] event=%s to=%s", event, user_email)
    try:
        html = _render_template(
            "otp_verification.html",
            {
                "otp_code": otp_code,
                "expiry_minutes": expiry_minutes,
            },
        )
        await _send_with_retry(
            to_email=user_email,
            subject=settings.EMAIL_SUBJECT_OTP,
            html_body=html,
            event_label=event,
        )
    except TemplateNotFound as exc:
        logger.error("[EMAIL_TEMPLATE_MISSING] event=%s template=%s", event, exc)
    except Exception as exc:  # noqa: BLE001
        logger.error("[EMAIL_ERROR] event=%s to=%s error=%s", event, user_email, exc, exc_info=True)


async def send_approval_email(
    user_email: str,
    user_name: str,
    role: str = "Researcher",
) -> None:
    """
    Send an approval notification when access is granted by an Admin or Super Admin.
    """
    event = "approval_notification"
    logger.info("[EMAIL_TRIGGER] event=%s to=%s", event, user_email)
    try:
        html = _render_template(
            "approval.html",
            {
                "user_name": user_name,
                "role": role,
                "login_url": f"{settings.FRONTEND_URL}/login",
            },
        )
        await _send_with_retry(
            to_email=user_email,
            subject=settings.EMAIL_SUBJECT_APPROVED,
            html_body=html,
            event_label=event,
        )
    except TemplateNotFound as exc:
        logger.error("[EMAIL_TEMPLATE_MISSING] event=%s template=%s", event, exc)
    except Exception as exc:  # noqa: BLE001
        logger.error("[EMAIL_ERROR] event=%s to=%s error=%s", event, user_email, exc, exc_info=True)


async def send_rejection_email(
    user_email: str,
    user_name: str,
    rejection_reason: Optional[str] = None,
) -> None:
    """
    Send a rejection notification when access is denied by an Admin or Super Admin.
    """
    event = "rejection_notification"
    logger.info("[EMAIL_TRIGGER] event=%s to=%s", event, user_email)
    try:
        html = _render_template(
            "rejection.html",
            {
                "user_name": user_name,
                "rejection_reason": rejection_reason,
            },
        )
        await _send_with_retry(
            to_email=user_email,
            subject=settings.EMAIL_SUBJECT_REJECTED,
            html_body=html,
            event_label=event,
        )
    except TemplateNotFound as exc:
        logger.error("[EMAIL_TEMPLATE_MISSING] event=%s template=%s", event, exc)
    except Exception as exc:  # noqa: BLE001
        logger.error("[EMAIL_ERROR] event=%s to=%s error=%s", event, user_email, exc, exc_info=True)


async def send_password_reset_otp(
    user_email: str,
    user_name: str,
    otp_code: str,
    expiry_minutes: int = 10,
) -> None:
    """
    Send a 6-digit OTP verification code for password reset.
    """
    event = "password_reset_otp"
    logger.info("[EMAIL_TRIGGER] event=%s to=%s", event, user_email)
    try:
        html = _render_template(
            "password_reset_otp.html",
            {
                "user_name": user_name,
                "user_email": user_email,
                "otp_code": otp_code,
                "expiry_minutes": expiry_minutes,
            },
        )
        await _send_with_retry(
            to_email=user_email,
            subject=getattr(settings, "EMAIL_SUBJECT_PASSWORD_RESET", "Password Reset Verification Code — Onco Sphere"),
            html_body=html,
            event_label=event,
        )
    except TemplateNotFound as exc:
        logger.error("[EMAIL_TEMPLATE_MISSING] event=%s template=%s", event, exc)
    except Exception as exc:  # noqa: BLE001
        logger.error("[EMAIL_ERROR] event=%s to=%s error=%s", event, user_email, exc, exc_info=True)

