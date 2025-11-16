import logging
import smtplib
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path
from typing import Optional
from functools import wraps
from app.core.config import settings


logger = logging.getLogger(__name__)


# Template directory
TEMPLATE_DIR = Path(__file__).parent.parent / "templates"



class EmailServiceError(Exception):
    """Custom exception for email service errors."""
    pass



def with_retry(max_attempts=3, delay=2):
    """Decorator to retry email operations with exponential backoff."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except (smtplib.SMTPException, ConnectionError, TimeoutError) as e:
                    last_exception = e
                    if attempt < max_attempts - 1:
                        wait_time = delay * (2 ** attempt)  # Exponential backoff
                        logger.warning(f"Email send attempt {attempt + 1} failed: {e}. Retrying in {wait_time}s...")
                        import time
                        time.sleep(wait_time)
                    else:
                        logger.error(f"All {max_attempts} email send attempts failed: {e}")
            raise EmailServiceError(f"Failed to send email after {max_attempts} attempts") from last_exception
        return wrapper
    return decorator



def load_template(template_name: str) -> str:
    """Load HTML template from file."""
    template_path = TEMPLATE_DIR / template_name
    with open(template_path, 'r', encoding='utf-8') as f:
        return f.read()



def render_template(template: str, **kwargs) -> str:
    """Simple template rendering with string replacement."""
    for key, value in kwargs.items():
        template = template.replace(f"{{{{ {key} }}}}", str(value))
    return template



def _is_email_configured() -> bool:
    """Check if email service is properly configured."""
    return (
        hasattr(settings, 'EMAIL__GMAIL_FROM_EMAIL') and 
        settings.EMAIL__GMAIL_FROM_EMAIL and
        hasattr(settings, 'EMAIL__GMAIL_APP_PASSWORD') and 
        settings.EMAIL__GMAIL_APP_PASSWORD
    )



@with_retry(max_attempts=3, delay=2)
def _send_smtp_email(to_email: str, subject: str, html_content: str):
    """Internal SMTP email sending with retry logic."""
    if not _is_email_configured():
        logger.warning("Email settings not configured, cannot send email")
        raise EmailServiceError("Email service not configured")
    
    try:
        msg = MIMEMultipart('alternative')
        msg['From'] = settings.EMAIL__GMAIL_FROM_EMAIL
        msg['To'] = to_email
        msg['Subject'] = subject
        
        # Add plain text fallback
        text_content = html_content.replace('<br>', '\n').replace('</p>', '\n')
        msg.attach(MIMEText(text_content, 'plain'))
        msg.attach(MIMEText(html_content, 'html'))
        
        with smtplib.SMTP('smtp.gmail.com', 587, timeout=30) as server:
            server.starttls()
            server.login(settings.EMAIL__GMAIL_FROM_EMAIL, settings.EMAIL__GMAIL_APP_PASSWORD)
            server.sendmail(settings.EMAIL__GMAIL_FROM_EMAIL, to_email, msg.as_string())
        
        logger.info(f"Email sent successfully to {to_email}")
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"SMTP authentication failed: {e}")
        raise EmailServiceError("Email authentication failed - check credentials")
    except smtplib.SMTPException as e:
        logger.error(f"SMTP error sending email to {to_email}: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error sending email to {to_email}: {e}")
        raise EmailServiceError(f"Failed to send email: {str(e)}")



def send_otp_verification_email(to_email: str, otp_code: str) -> bool:
    """
    Send OTP verification email with retry logic.
    
    Returns:
        bool: True if sent successfully, False otherwise
    """
    if not _is_email_configured():
        logger.warning("Email not configured - OTP will be logged instead")
        logger.info(f"OTP for {to_email}: {otp_code}")
        return False
    
    try:
        template = load_template("otp_verification.html")
        html_content = render_template(template, otp_code=otp_code)
        _send_smtp_email(to_email, "Verify Your Email - ChatBot", html_content)
        return True
    except EmailServiceError as e:
        logger.error(f"Failed to send OTP email to {to_email}: {e}")
        logger.info(f"Fallback: OTP for {to_email}: {otp_code}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error sending OTP email to {to_email}: {e}")
        return False



def send_token_verification_email(to_email: str, verification_link: str) -> bool:
    """
    Send token-based verification email with retry logic.
    
    Returns:
        bool: True if sent successfully, False otherwise
    """
    if not _is_email_configured():
        logger.warning("Email not configured - verification link will be logged instead")
        logger.info(f"Verification link for {to_email}: {verification_link}")
        return False
    
    try:
        template = load_template("token_verification.html")
        html_content = render_template(template, verification_link=verification_link)
        _send_smtp_email(to_email, "Verify Your Email - ChatBot", html_content)
        return True
    except EmailServiceError as e:
        logger.error(f"Failed to send verification email to {to_email}: {e}")
        logger.info(f"Fallback: Verification link for {to_email}: {verification_link}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error sending verification email to {to_email}: {e}")
        return False



def send_email(to_email: str, subject: str, body: str) -> bool:
    """
    Legacy email sending function for backward compatibility.
    
    Returns:
        bool: True if sent successfully, False otherwise
    """
    if not _is_email_configured():
        logger.warning("Email not configured - email content will be logged instead")
        logger.info(f"Email to {to_email} - Subject: {subject}")
        return False
    
    try:
        _send_smtp_email(to_email, subject, body)
        return True
    except EmailServiceError as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error sending email to {to_email}: {e}")
        return False
