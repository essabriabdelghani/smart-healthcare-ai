"""
Email sending via SMTP (Gmail by default, but compatible with any standard
SMTP provider: Outlook, OVH, SendGrid in SMTP mode, etc.).

Defensive by design: if smtp_user/smtp_password are not configured,
we log to console instead of failing — useful in local development without
having to configure a real email account right away.
"""

import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings


def _is_configured() -> bool:
    return bool(settings.smtp_user and settings.smtp_password)


def send_email(to_email: str, subject: str, html_body: str, text_body: str = "") -> bool:
    """Returns True if the email was sent (or simulated in dev), False in
    case of real failure. Never raises an exception to the caller — a failed
    email send should never crash an API request."""

    if not _is_configured():
        # Development mode: no real SMTP configured, display the
        # content in logs to still be able to test the flow.
        print("=" * 60)
        print("[EMAIL NOT SENT — SMTP not configured in .env]")
        print(f"To: {to_email}")
        print(f"Subject: {subject}")
        print(text_body or html_body)
        print("=" * 60)
        return True

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = f"{settings.email_from_name} <{settings.email_from or settings.smtp_user}>"
    message["To"] = to_email

    if text_body:
        message.attach(MIMEText(text_body, "plain"))
    message.attach(MIMEText(html_body, "html"))

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls(context=context)
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_user, to_email, message.as_string())
        return True
    except Exception as e:
        print(f"[EMAIL SEND ERROR] {e}")
        return False


def send_password_reset_email(to_email: str, full_name: str, reset_link: str) -> bool:
    subject = "Reset your password — Digital Clinic"

    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1f3d33;">Password reset</h2>
        <p>Hello {full_name},</p>
        <p>You have requested to reset your password on Digital Clinic.</p>
        <p>
            <a href="{reset_link}"
               style="display: inline-block; background: #1f3d33; color: #f7f6f1;
                      padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">
                Reset my password
            </a>
        </p>
        <p style="color: #4b544e; font-size: 13px;">
            This link expires in {settings.reset_token_expire_minutes} minutes.
            If you did not request this, simply ignore this email.
        </p>
        <p style="color: #4b544e; font-size: 12px; word-break: break-all;">{reset_link}</p>
    </div>
    """

    text_body = (
        f"Hello {full_name},\n\n"
        f"Reset your password via this link (valid for {settings.reset_token_expire_minutes} min):\n"
        f"{reset_link}\n\n"
        f"If you did not request this, ignore this email."
    )

    return send_email(to_email, subject, html_body, text_body)