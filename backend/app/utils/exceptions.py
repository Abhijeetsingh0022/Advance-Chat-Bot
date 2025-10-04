"""Custom exceptions for the ChatBot API."""

from fastapi import HTTPException, status
from typing import Any, Dict, Optional


class ChatBotException(HTTPException):
    """Base exception class for ChatBot API errors."""

    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: Optional[str] = None,
        headers: Optional[Dict[str, Any]] = None
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)
        self.error_code = error_code


class AuthenticationError(ChatBotException):
    """Authentication related errors."""

    def __init__(self, detail: str = "Authentication failed", error_code: str = "AUTH_ERROR"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            error_code=error_code
        )


class AuthorizationError(ChatBotException):
    """Authorization related errors."""

    def __init__(self, detail: str = "Insufficient permissions", error_code: str = "AUTHZ_ERROR"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            error_code=error_code
        )


class ValidationError(ChatBotException):
    """Input validation errors."""

    def __init__(self, detail: str = "Invalid input data", error_code: str = "VALIDATION_ERROR"):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail,
            error_code=error_code
        )


class ResourceNotFoundError(ChatBotException):
    """Resource not found errors."""

    def __init__(self, detail: str = "Resource not found", error_code: str = "NOT_FOUND"):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
            error_code=error_code
        )


class RateLimitError(ChatBotException):
    """Rate limiting errors."""

    def __init__(self, detail: str = "Too many requests", error_code: str = "RATE_LIMITED"):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=detail,
            error_code=error_code,
            headers={"Retry-After": "60"}
        )


class ExternalServiceError(ChatBotException):
    """External service errors (AI providers, email, etc.)."""

    def __init__(self, detail: str = "External service error", error_code: str = "EXTERNAL_ERROR"):
        super().__init__(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=detail,
            error_code=error_code
        )


class DatabaseError(ChatBotException):
    """Database related errors."""

    def __init__(self, detail: str = "Database error", error_code: str = "DB_ERROR"):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
            error_code=error_code
        )


class DatabaseConnectionError(DatabaseError):
    """Database connection errors."""

    def __init__(self, detail: str = "Database connection failed", error_code: str = "DB_CONNECTION_ERROR"):
        super().__init__(detail=detail, error_code=error_code)


class DatabaseTimeoutError(DatabaseError):
    """Database timeout errors."""

    def __init__(self, detail: str = "Database operation timed out", error_code: str = "DB_TIMEOUT_ERROR"):
        super().__init__(detail=detail, error_code=error_code)


class DatabaseValidationError(DatabaseError):
    """Database validation errors."""

    def __init__(self, detail: str = "Database validation failed", error_code: str = "DB_VALIDATION_ERROR"):
        super().__init__(detail=detail, error_code=error_code)


class DatabaseDuplicateError(DatabaseError):
    """Database duplicate key errors."""

    def __init__(self, detail: str = "Duplicate entry", error_code: str = "DB_DUPLICATE_ERROR"):
        super().__init__(detail=detail, error_code=error_code)


class SessionNotFoundError(ResourceNotFoundError):
    """Session not found errors."""

    def __init__(self, session_id: str, error_code: str = "SESSION_NOT_FOUND"):
        super().__init__(detail=f"Session {session_id} not found", error_code=error_code)
        self.session_id = session_id


class MessageValidationError(ValidationError):
    """Message validation errors."""

    def __init__(self, detail: str = "Invalid message data", error_code: str = "MESSAGE_VALIDATION_ERROR"):
        super().__init__(detail=detail, error_code=error_code)