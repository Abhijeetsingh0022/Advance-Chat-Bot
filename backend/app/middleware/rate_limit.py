import logging
import os
from fastapi import Request, HTTPException, status
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.middleware import SlowAPIMiddleware
from slowapi.errors import RateLimitExceeded
from app.core.config import settings

logger = logging.getLogger(__name__)

# Initialize rate limiter with Redis if available, otherwise in-memory
redis_url = getattr(settings, 'REDIS_URL', None) or os.getenv("REDIS_URL")
if redis_url:
    limiter = Limiter(key_func=get_remote_address, storage_uri=redis_url)
    logger.info("Rate limiter initialized with Redis backend")
else:
    limiter = Limiter(key_func=get_remote_address)
    logger.info("Rate limiter initialized with in-memory backend")

# Rate limit exceeded handler
def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """Custom handler for rate limit exceeded errors."""
    from fastapi.responses import JSONResponse
    
    logger.warning(f"Rate limit exceeded for {get_remote_address(request)}: {exc.detail}")
    logger.warning(f"SECURITY: Rate limit exceeded event for IP {get_remote_address(request)}")
    
    headers = {}
    if hasattr(exc, 'retry_after'):
        headers["Retry-After"] = str(exc.retry_after)
    
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={"detail": "Too many requests. Please try again later."},
        headers=headers
    )

# Custom middleware to apply different rate limits based on endpoint
class EndpointRateLimitMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        # Simply pass through - rate limiting will be handled by decorators on routes
        await self.app(scope, receive, send)

# Chat-specific rate limits (more restrictive)
chat_limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=redis_url if redis_url else None,
    default_limits=[f"{settings.RATE_LIMIT__CHAT_REQUESTS_PER_MINUTE}/minute"]
)

# File upload rate limits (most restrictive)
file_limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=redis_url if redis_url else None,
    default_limits=[f"{settings.RATE_LIMIT__CHAT_WITH_FILES_REQUESTS_PER_MINUTE}/minute"]
)

# User-specific rate limits for authenticated users
def get_user_key_func(request: Request) -> str:
    """Get rate limit key based on user ID for authenticated requests."""
    try:
        # This will be populated by the auth middleware
        user_id = request.headers.get("X-User-ID") or get_remote_address(request)
        return f"user:{user_id}"
    except:
        return get_remote_address(request)

user_limiter = Limiter(
    key_func=get_user_key_func,
    storage_uri=redis_url if redis_url else None,
    default_limits=[f"{settings.RATE_LIMIT__USER_REQUESTS_PER_MINUTE}/minute"]
)

# Bulk operations limiter
bulk_limiter = Limiter(
    key_func=get_user_key_func,
    storage_uri=redis_url if redis_url else None,
    default_limits=[f"{settings.RATE_LIMIT__BULK_OPERATIONS_PER_MINUTE}/minute"]
)

# Export the limiter and handler for use in main.py
__all__ = ["limiter", "chat_limiter", "file_limiter", "user_limiter", "bulk_limiter", "rate_limit_exceeded_handler", "SlowAPIMiddleware"]