"""
app/services/email_service.py
──────────────────────────────────────────────────────────────────────────────
Production-grade async email service for Onco Sphere, delivered through the
Resend HTTPS API (https://resend.com/docs/api-reference/emails/send-email).

HTTPS (port 443) is used instead of SMTP, so delivery works on hosts that
block outbound SMTP ports (e.g. Render Free).

Design principles:
  • Non-blocking — all sends run as FastAPI BackgroundTasks (never block API)
  • Retry logic — exponential backoff on transient failures (network, 429, 5xx)
  • Idempotent retries — one Idempotency-Key per email, reused across attempts
  • Structured logging — every event is logged; recipients are masked and
    secrets (API key, OTPs, tokens) are never logged
  • Never raises — email failures are caught and logged; main flow is unaffected
  • Config-driven — sender, recipients and subjects come from environment
  • Template-based — Jinja2 HTML templates for professional branded emails

Usage in routes:
    background_tasks.add_task(email_service.send_registration_confirmation, ...)
    background_tasks.add_task(email_service.send_admin_new_application_notification, ...)
    background_tasks.add_task(email_service.send_otp_email, ...)
    background_tasks.add_task(email_service.send_approval_email, ...)
    background_tasks.add_task(email_service.send_rejection_email, ...)
    background_tasks.add_task(email_service.send_password_reset_otp, ...)
──────────────────────────────────────────────────────────────────────────────
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from pathlib import Path
from typing import Any, Dict, Optional

import httpx
from jinja2 import Environment, FileSystemLoader, TemplateNotFound, select_autoescape

from app.config.settings import settings

# ── Structured logger ─────────────────────────────────────────────────────────
logger = logging.getLogger("onco_sphere.email")

# ── Resend API ────────────────────────────────────────────────────────────────
_RESEND_SEND_URL = "https://api.resend.com/emails"
_REQUEST_TIMEOUT_SECONDS = 15.0

# ── Template directory (relative to project root, resolved at import time) ────
_TEMPLATES_DIR = Path(__file__).parent.parent / "templates" / "emails"


# ──────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ──────────────────────────────────────────────────────────────────────────────

def _mask_email(address: str) -> str:
    """Mask an email address for logs: 'jane.doe@uni.edu' -> 'j***@uni.edu'."""
    if not address or "@" not in address:
        return "***"
    local, domain = address.split("@", 1)
    return f"{local[:1]}***@{domain}"


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


def _build_payload(to_email: str, subject: str, html_body: str) -> Dict[str, Any]:
    """Build the JSON body for the Resend send-email endpoint."""
    payload: Dict[str, Any] = {
        "from": f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM}>",
        "to": [to_email],
        "subject": subject,
        "html": html_body,
    }
    if settings.EMAIL_REPLY_TO:
        payload["reply_to"] = settings.EMAIL_REPLY_TO
    return payload


async def _send_with_retry(
    to_email: str,
    subject: str,
    html_body: str,
    event_label: str = "email",
) -> bool:
    """
    Send an email via the Resend HTTPS API with exponential-backoff retry.

    Retries on network errors, HTTP 429 and HTTP 5xx. Other 4xx responses
    (bad API key, unverified sender domain, invalid payload) are permanent
    and are not retried.

    Returns True on success, False when the email could not be sent.
    Never raises -- all exceptions are caught and logged.
    """
    masked_to = _mask_email(to_email)

    # Guard: skip if the email provider is not configured
    if not settings.RESEND_API_KEY or not settings.EMAIL_FROM:
        logger.warning(
            "[EMAIL_SKIP] Resend not configured (set RESEND_API_KEY and EMAIL_FROM). "
            "event=%s to=%s",
            event_label, masked_to,
        )
        return False

    max_retries: int = max(1, settings.EMAIL_MAX_RETRIES)
    base_delay: float = settings.EMAIL_RETRY_BASE_DELAY
    payload = _build_payload(to_email, subject, html_body)
    headers = {
        "Authorization": f"Bearer {settings.RESEND_API_KEY}",
        "Content-Type": "application/json",
        # Same key on every attempt so a retried request is never delivered twice
        "Idempotency-Key": f"{event_label}-{uuid.uuid4()}",
    }

    async with httpx.AsyncClient(timeout=_REQUEST_TIMEOUT_SECONDS) as client:
        for attempt in range(1, max_retries + 1):
            failure_reason: str
            try:
                logger.info(
                    "[EMAIL_ATTEMPT] event=%s to=%s attempt=%d/%d",
                    event_label, masked_to, attempt, max_retries,
                )
                response = await client.post(_RESEND_SEND_URL, json=payload, headers=headers)

                if response.is_success:
                    message_id = response.json().get("id", "unknown")
                    logger.info(
                        "[EMAIL_SUCCESS] event=%s to=%s attempt=%d resend_id=%s",
                        event_label, masked_to, attempt, message_id,
                    )
                    return True

                status_code = response.status_code
                if status_code != 429 and status_code < 500:
                    # Permanent error -- the response body explains why
                    # (e.g. invalid API key, unverified domain); it never contains the key.
                    logger.error(
                        "[EMAIL_REJECTED] event=%s to=%s status=%d detail=%s",
                        event_label, masked_to, status_code, response.text[:300],
                    )
                    return False

                failure_reason = f"HTTP {status_code}"

            except httpx.TransportError as exc:
                # Timeouts, DNS failures, connection resets -- transient
                failure_reason = type(exc).__name__

            except Exception as exc:  # noqa: BLE001
                logger.error(
                    "[EMAIL_UNEXPECTED_ERROR] event=%s to=%s error=%s",
                    event_label, masked_to, type(exc).__name__,
                    exc_info=True,
                )
                return False

            # Transient failure -- back off and retry, or give up
            if attempt < max_retries:
                delay = base_delay * (2 ** (attempt - 1))
                logger.warning(
                    "[EMAIL_RETRY] event=%s to=%s attempt=%d/%d reason=%s retry_in=%.1fs",
                    event_label, masked_to, attempt, max_retries, failure_reason, delay,
                )
                await asyncio.sleep(delay)
            else:
                logger.error(
                    "[EMAIL_FAILED] event=%s to=%s all_%d_attempts_exhausted reason=%s",
                    event_label, masked_to, max_retries, failure_reason,
                )

    return False


async def _render_and_send(
    event: str,
    to_email: str,
    subject: str,
    template_name: str,
    context: Dict[str, Any],
) -> None:
    """Render a template and send it. Never raises."""
    logger.info("[EMAIL_TRIGGER] event=%s to=%s", event, _mask_email(to_email))
    try:
        html = _render_template(template_name, context)
        await _send_with_retry(
            to_email=to_email,
            subject=subject,
            html_body=html,
            event_label=event,
        )
    except TemplateNotFound as exc:
        logger.error("[EMAIL_TEMPLATE_MISSING] event=%s template=%s", event, exc)
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "[EMAIL_ERROR] event=%s to=%s error=%s",
            event, _mask_email(to_email), type(exc).__name__,
            exc_info=True,
        )


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
    await _render_and_send(
        event="registration_confirmation",
        to_email=user_email,
        subject=settings.EMAIL_SUBJECT_REGISTRATION,
        template_name="registration_confirmation.html",
        context={
            "user_name": user_name,
            "user_email": user_email,
            "institution": institution,
            "researcher_role": researcher_role,
            "research_area": research_area,
            "login_url": f"{settings.FRONTEND_URL}/login",
        },
    )


async def send_admin_new_application_notification(
    applicant_email: str,
    applicant_name: str,
    institution: str = "N/A",
    researcher_role: str = "N/A",
    research_area: str = "N/A",
) -> None:
    """
    Notify the Super Admin that a new researcher application is awaiting review.
    Skipped (with a warning) when SUPER_ADMIN_EMAIL is not configured.
    """
    event = "admin_new_application"
    if not settings.SUPER_ADMIN_EMAIL:
        logger.warning("[EMAIL_SKIP] event=%s SUPER_ADMIN_EMAIL is not configured.", event)
        return

    await _render_and_send(
        event=event,
        to_email=settings.SUPER_ADMIN_EMAIL,
        subject=settings.EMAIL_SUBJECT_ADMIN_NEW_APPLICATION,
        template_name="admin_new_application.html",
        context={
            "applicant_name": applicant_name,
            "applicant_email": applicant_email,
            "institution": institution,
            "researcher_role": researcher_role,
            "research_area": research_area,
            "review_url": f"{settings.FRONTEND_URL}/admin",
        },
    )


async def send_otp_email(
    user_email: str,
    otp_code: str,
    expiry_minutes: int = 10,
) -> None:
    """
    Send an OTP verification code so the researcher can securely resume their draft.
    """
    await _render_and_send(
        event="otp_verification",
        to_email=user_email,
        subject=settings.EMAIL_SUBJECT_OTP,
        template_name="otp_verification.html",
        context={
            "otp_code": otp_code,
            "expiry_minutes": expiry_minutes,
        },
    )


async def send_approval_email(
    user_email: str,
    user_name: str,
    role: str = "Researcher",
) -> None:
    """
    Send an approval notification when access is granted by an Admin or Super Admin.
    """
    await _render_and_send(
        event="approval_notification",
        to_email=user_email,
        subject=settings.EMAIL_SUBJECT_APPROVED,
        template_name="approval.html",
        context={
            "user_name": user_name,
            "role": role,
            "login_url": f"{settings.FRONTEND_URL}/login",
        },
    )


async def send_rejection_email(
    user_email: str,
    user_name: str,
    rejection_reason: Optional[str] = None,
) -> None:
    """
    Send a rejection notification when access is denied by an Admin or Super Admin.
    """
    await _render_and_send(
        event="rejection_notification",
        to_email=user_email,
        subject=settings.EMAIL_SUBJECT_REJECTED,
        template_name="rejection.html",
        context={
            "user_name": user_name,
            "rejection_reason": rejection_reason,
        },
    )


async def send_password_reset_otp(
    user_email: str,
    user_name: str,
    otp_code: str,
    expiry_minutes: int = 10,
) -> None:
    """
    Send a 6-digit OTP verification code for password reset.
    """
    await _render_and_send(
        event="password_reset_otp",
        to_email=user_email,
        subject=settings.EMAIL_SUBJECT_PASSWORD_RESET,
        template_name="password_reset_otp.html",
        context={
            "user_name": user_name,
            "user_email": user_email,
            "otp_code": otp_code,
            "expiry_minutes": expiry_minutes,
        },
    )
