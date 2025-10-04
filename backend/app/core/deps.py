"""
Dependency injection functions for FastAPI
"""
import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import decode_access_token
from app.db.mongodb import get_users_collection, get_revoked_tokens_collection
from bson import ObjectId

logger = logging.getLogger(__name__)

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    """Get current authenticated user from JWT token using MongoDB."""
    try:
        token = credentials.credentials
        logger.info(f"Authenticating with token: {token[:20]}...")
        
        # Check if token is revoked
        revoked_tokens_collection = get_revoked_tokens_collection()
        revoked_token = await revoked_tokens_collection.find_one({"token": token})
        
        if revoked_token:
            logger.warning("SECURITY: Attempt to use revoked token")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Decode token
        logger.info("Decoding token...")
        payload = decode_access_token(token)
        logger.info(f"Token payload: {payload}")
        
        if payload is None:
            logger.warning("SECURITY: Invalid token used - payload is None")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user_id: str = payload.get("sub")
        logger.info(f"User ID from token: {user_id}")
        
        if user_id is None:
            logger.warning("SECURITY: Token without subject claim")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Verify user exists and is active
        logger.info(f"Looking up user {user_id}...")
        users_collection = get_users_collection()
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        logger.info(f"User found: {user is not None}, Active: {user.get('is_active') if user else 'N/A'}")
        
        if not user or not user.get("is_active", False):
            logger.warning(f"SECURITY: Token for inactive or non-existent user {user_id}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        logger.info(f"Authentication successful for user {user_id}")
        return user_id
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_admin_user(
    user_id: str = Depends(get_current_user)
) -> str:
    """Get current authenticated admin user using MongoDB."""
    try:
        users_collection = get_users_collection()
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        
        if not user or not user.get("is_admin", False):
            logger.warning(f"SECURITY: Non-admin user {user_id} attempted admin action")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        
        return user_id
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
