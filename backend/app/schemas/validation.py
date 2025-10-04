"""Enhanced validation models for the ChatBot API."""

import re
from typing import Optional, Annotated, Literal
from pydantic import BaseModel, Field, EmailStr, validator, field_validator
from app.utils.exceptions import ValidationError
from enum import Enum


class ConversationType(str, Enum):
    """Types of conversations for intelligent model routing."""
    coding = "coding"
    reasoning = "reasoning"
    general = "general"
    image = "image"
    text = "text"


class SecureEmailStr(EmailStr):
    """Enhanced email validation with additional security checks."""

    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, value: str) -> str:
        # Basic email validation
        email = super(EmailStr, EmailStr).validate(value)

        # Additional security checks
        if len(email) > 254:  # RFC 5321 limit
            raise ValidationError("Email address is too long")

        # Check for suspicious patterns
        suspicious_patterns = [
            r'\.\.',  # consecutive dots
            r'^\.',   # starts with dot
            r'\.$',   # ends with dot
        ]

        for pattern in suspicious_patterns:
            if re.search(pattern, email):
                raise ValidationError("Invalid email format")

        return email


class PasswordRequirements:
    """Password validation requirements."""

    MIN_LENGTH = 8
    MAX_LENGTH = 128
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True
    REQUIRE_DIGITS = True
    REQUIRE_SPECIAL_CHARS = True  # FIXED: Enabled special character requirement

    @classmethod
    def validate_password(cls, password: str) -> str:
        """Validate password against requirements."""
        if not isinstance(password, str):
            raise ValidationError("Password must be a string")

        issues = []

        if len(password) < cls.MIN_LENGTH:
            issues.append(f"Password must be at least {cls.MIN_LENGTH} characters long")

        if len(password) > cls.MAX_LENGTH:
            issues.append(f"Password must be at most {cls.MAX_LENGTH} characters long")

        if cls.REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
            issues.append("Password must contain at least one uppercase letter")

        if cls.REQUIRE_LOWERCASE and not re.search(r'[a-z]', password):
            issues.append("Password must contain at least one lowercase letter")

        if cls.REQUIRE_DIGITS and not re.search(r'\d', password):
            issues.append("Password must contain at least one digit")

        if cls.REQUIRE_SPECIAL_CHARS and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            issues.append("Password must contain at least one special character")

        # Check for common weak passwords
        weak_passwords = [
            'password', '123456', '123456789', 'qwerty', 'abc123',
            'password123', 'admin', 'letmein', 'welcome', 'monkey'
        ]

        if password.lower() in weak_passwords:
            issues.append("This password is too common and easily guessable")

        # Check for repeated characters
        if re.search(r'(.)\1{3,}', password):  # 4 or more repeated characters
            issues.append("Password contains too many repeated characters")

        if issues:
            raise ValidationError("; ".join(issues))

        return password


class RegisterRequest(BaseModel):
    """Enhanced registration request with comprehensive validation."""
    email: SecureEmailStr = Field(..., description="Valid email address")
    password: Annotated[str, Field(min_length=8, max_length=128, description="Password must be 8-128 characters with mixed case and numbers")]
    verification_method: str = Field("otp", description="Verification method: 'otp' or 'token'")

    @field_validator('verification_method')
    @classmethod
    def validate_verification_method(cls, v):
        if v not in ["otp", "token"]:
            raise ValidationError("Verification method must be 'otp' or 'token'")
        return v

    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v):
        return PasswordRequirements.validate_password(v)


class LoginRequest(BaseModel):
    """Enhanced login request."""
    email: SecureEmailStr = Field(..., description="Valid email address")
    password: str = Field(..., min_length=1, description="User password")


class OTPVerificationRequest(BaseModel):
    """OTP verification request."""
    email: SecureEmailStr = Field(..., description="Email address used for registration")
    otp: Annotated[str, Field(pattern=r'^\d{6}$', description="6-digit OTP code")]


class ChatRequest(BaseModel):
    """Enhanced chat request with validation and model parameters."""
    message: Annotated[str, Field(min_length=1, max_length=10000, description="Chat message (1-10000 characters)")]
    session_id: Optional[str] = Field(None, description="Optional session identifier for conversation continuity")
    conversation_type: ConversationType = Field(ConversationType.general, description="Type of conversation for intelligent model routing")
    max_tokens: Optional[Annotated[int, Field(ge=1, le=4000)]] = Field(1000, description="Maximum tokens in response (1-4000)")
    temperature: Optional[Annotated[float, Field(ge=0.0, le=2.0)]] = Field(0.7, description="Creativity/randomness (0.0-2.0)")
    model: Optional[str] = Field(None, description="Specific AI model to use (e.g., 'llama-3.1-8b-instant', 'grok-4-fast', etc.)")

    @field_validator('message')
    @classmethod
    def validate_message_content(cls, v):
        if not isinstance(v, str):
            raise ValidationError("Message must be a string")

        # Check message length
        if len(v) > 10000:
            raise ValidationError("Message exceeds maximum length of 10,000 characters")
        if len(v.strip()) == 0:
            raise ValidationError("Message cannot be empty or only whitespace")

        # Sanitize content - remove or escape potentially harmful patterns
        harmful_patterns = [
            r'<script[^>]*>.*?</script>',  # Script tags
            r'<iframe[^>]*>.*?</iframe>',  # Iframe tags
            r'<object[^>]*>.*?</object>',  # Object tags
            r'<embed[^>]*>.*?</embed>',   # Embed tags
            r'javascript:',                # JavaScript URLs
            r'vbscript:',                  # VBScript URLs
            r'data:',                      # Data URLs (can be dangerous)
            r'on\w+\s*=',                  # Event handlers
        ]

        cleaned = v
        for pattern in harmful_patterns:
            cleaned = re.sub(pattern, '[REMOVED]', cleaned, flags=re.IGNORECASE | re.DOTALL)

        # Additional sanitization - remove null bytes and other control characters
        cleaned = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', cleaned)

        # Check if message became empty after cleaning
        if len(cleaned.strip()) == 0:
            raise ValidationError("Message contains only invalid content")

        return cleaned

    @field_validator('session_id')
    @classmethod
    def validate_session_id(cls, v):
        if v is None:
            return v

        if not isinstance(v, str):
            raise ValidationError("Session ID must be a string")

        # Validate UUID format (basic check)
        uuid_pattern = r'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
        if not re.match(uuid_pattern, v, re.IGNORECASE):
            raise ValidationError("Session ID must be a valid UUID format")

        return v


class ChatResponse(BaseModel):
    """Enhanced chat response model."""
    message_id: str = Field(..., description="Unique message identifier")
    session_id: str = Field(..., description="Conversation session identifier")
    reply: str = Field(..., description="AI generated response")
    model: Optional[str] = Field(None, description="AI model used")
    provider: Optional[str] = Field(None, description="AI provider used")
    request_type: Optional[str] = Field(None, description="Detected request type")
    usage: Optional[dict] = Field(None, description="Token usage statistics")
    conversation_type: ConversationType = Field(..., description="Conversation type used")


class ConversationHistoryResponse(BaseModel):
    """Conversation history response."""
    session_id: str
    messages: list[dict] = Field(..., description="List of messages in the conversation")


class UserSessionsResponse(BaseModel):
    """User sessions response."""
    sessions: list[dict] = Field(..., description="List of user conversation sessions")


class UserResponse(BaseModel):
    """User information response."""
    id: int
    email: str
    is_active: bool
    is_verified: bool
    created_at: str


class ForgotPasswordRequest(BaseModel):
    """Forgot password request."""
    email: SecureEmailStr = Field(..., description="Email address for password reset")


class ResetPasswordRequest(BaseModel):
    """Reset password request."""
    token: str = Field(..., description="Password reset token")
    new_password: Annotated[str, Field(min_length=8, max_length=128, description="New password must be 8-128 characters with mixed case and numbers")]

    @field_validator('new_password')
    @classmethod
    def validate_new_password(cls, v):
        return PasswordRequirements.validate_password(v)


class ResendVerificationRequest(BaseModel):
    """Request to resend verification (OTP or token)."""
    email: SecureEmailStr = Field(..., description="Email address to resend verification to")
    verification_method: Optional[str] = Field(None, description="Optional: 'otp' or 'token' to force a specific method")

    @field_validator('verification_method')
    @classmethod
    def validate_verification_method(cls, v):
        if v is None:
            return v
        if v not in ["otp", "token"]:
            raise ValidationError("Verification method must be 'otp' or 'token'")
        return v


class SessionUpdateRequest(BaseModel):
    """Session update request."""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Session name/title")


class SessionSummaryResponse(BaseModel):
    """Session summary response."""
    session_id: str
    message_count: int
    first_message_at: str
    last_message_at: str
    user_messages: int
    assistant_messages: int
    total_tokens: Optional[int] = None


class ExportFormat(str, Enum):
    """Export format options."""
    json = "json"
    txt = "txt"
    markdown = "markdown"


class ExportRequest(BaseModel):
    """Export conversation request."""
    format: ExportFormat = Field(ExportFormat.json, description="Export format")
    include_metadata: bool = Field(True, description="Include message metadata")


class FileUploadValidation:
    """File upload validation utilities."""

    ALLOWED_EXTENSIONS = {
        # Images
        'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg',
        # Documents
        'txt', 'md', 'pdf', 'doc', 'docx', 'rtf',
        # Code files
        'py', 'js', 'ts', 'html', 'css', 'json', 'xml', 'yaml', 'yml',
        # Data files
        'csv', 'json', 'xml'
    }

    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    MAX_FILENAME_LENGTH = 255

    @classmethod
    def validate_file(cls, filename: str, file_size: int, content_type: str) -> None:
        """Validate a file upload."""
        if not filename or not filename.strip():
            raise ValidationError("Filename cannot be empty")

        if len(filename) > cls.MAX_FILENAME_LENGTH:
            raise ValidationError(f"Filename too long (max {cls.MAX_FILENAME_LENGTH} characters)")

        # Sanitize filename - remove path traversal attempts
        if '..' in filename or '/' in filename or '\\' in filename:
            raise ValidationError("Invalid filename")

        # Check file extension
        if '.' not in filename:
            raise ValidationError("File must have an extension")

        extension = filename.rsplit('.', 1)[1].lower()
        if extension not in cls.ALLOWED_EXTENSIONS:
            raise ValidationError(f"File type not allowed. Allowed types: {', '.join(sorted(cls.ALLOWED_EXTENSIONS))}")

        # Check file size
        if file_size > cls.MAX_FILE_SIZE:
            raise ValidationError(f"File too large (max {cls.MAX_FILE_SIZE // (1024*1024)}MB)")

        # Validate content type matches extension
        expected_types = {
            'png': ['image/png'],
            'jpg': ['image/jpeg'],
            'jpeg': ['image/jpeg'],
            'gif': ['image/gif'],
            'bmp': ['image/bmp'],
            'webp': ['image/webp'],
            'svg': ['image/svg+xml'],
            'txt': ['text/plain'],
            'md': ['text/markdown', 'text/plain'],
            'pdf': ['application/pdf'],
            'json': ['application/json', 'text/plain'],
            'xml': ['application/xml', 'text/xml'],
            'yaml': ['application/x-yaml', 'text/plain'],
            'yml': ['application/x-yaml', 'text/plain'],
            'csv': ['text/csv', 'application/csv'],
        }

        if extension in expected_types and content_type not in expected_types[extension]:
            # Allow some flexibility but log warning
            pass  # Could add logging here if needed

    @classmethod
    def sanitize_filename(cls, filename: str) -> str:
        """Sanitize filename for safe storage."""
        # Remove path components
        filename = filename.replace('/', '_').replace('\\', '_')

        # Remove dangerous characters
        dangerous_chars = ['<', '>', ':', '"', '|', '?', '*']
        for char in dangerous_chars:
            filename = filename.replace(char, '_')

        # Ensure it's not too long
        if len(filename) > cls.MAX_FILENAME_LENGTH:
            name, ext = filename.rsplit('.', 1)
            filename = name[:cls.MAX_FILENAME_LENGTH-len(ext)-1] + '.' + ext

        return filename