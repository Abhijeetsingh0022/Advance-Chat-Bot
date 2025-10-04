"""Standardized error response models."""

from pydantic import BaseModel
from typing import Optional, Any, Dict


class ErrorResponse(BaseModel):
    """Standard error response model."""
    error: str
    message: str
    error_code: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class ValidationErrorDetail(BaseModel):
    """Detailed validation error information."""
    field: str
    message: str
    value: Optional[Any] = None


class ValidationErrorResponse(ErrorResponse):
    """Validation error response with field details."""
    errors: list[ValidationErrorDetail]