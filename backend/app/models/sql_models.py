"""
SQL database models using SQLModel
"""
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, Index


class User(SQLModel, table=True):
    """User model for authentication and authorization."""
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, nullable=False, unique=True)
    hashed_password: str
    is_active: bool = True
    is_verified: bool = False
    is_admin: bool = False
    verification_method: Optional[str] = None  # "otp" or "token"
    otp: Optional[str] = None
    otp_expires_at: Optional[datetime] = None
    verification_token: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Message(SQLModel, table=True):
    """Message model for SQL database (deprecated, use MongoDB)."""
    __table_args__ = (
        Index('ix_message_user_session_created', 'user_id', 'session_id', 'created_at'),
    )
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    session_id: Optional[str] = None
    role: str = "user"
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class RevokedToken(SQLModel, table=True):
    """Token revocation model for logout functionality."""
    __tablename__ = "revokedtoken"
    __table_args__ = (
        Index('ix_revokedtoken_token_expires', 'token', 'expires_at'),
    )
    
    id: Optional[int] = Field(default=None, primary_key=True)
    token: str = Field(index=True)
    expires_at: Optional[datetime] = None
    revoked_at: datetime = Field(default_factory=datetime.utcnow)
