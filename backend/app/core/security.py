"""
Security utilities for authentication and authorization
"""
import logging
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import settings

logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hashed password."""
    try:
        result = pwd_context.verify(plain_password, hashed_password)
        if not result:
            logger.warning("SECURITY: Failed password verification attempt.")
        else:
            logger.debug("Password verification completed.")
        return result
    except Exception as e:
        logger.error(f"Password verification failed: {e}")
        logger.warning("SECURITY: Exception during password verification.")
        return False


def get_password_hash(password: str) -> str:
    """Hash a password using Argon2."""
    try:
        hashed = pwd_context.hash(password)
        logger.debug("Password hashing completed.")
        return hashed
    except Exception as e:
        logger.error(f"Password hashing failed: {e}")
        raise


def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    try:
        to_encode = {"sub": subject}
        expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
        to_encode.update({"exp": expire})
        
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        
        logger.debug("Access token created successfully.")
        return encoded_jwt
    except Exception as e:
        logger.error(f"Failed to create access token: {e}")
        raise


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT access token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        logger.debug("Access token decoded successfully.")
        return payload
    except JWTError as e:
        logger.warning(f"JWT decode error: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error decoding token: {e}")
        return None
