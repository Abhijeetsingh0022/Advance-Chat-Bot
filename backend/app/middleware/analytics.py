"""Analytics tracking middleware."""
import logging
import time
import asyncio
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from app.services.analytics_service import AnalyticsService
from app.db.mongodb import mongodb_manager

logger = logging.getLogger(__name__)


class AnalyticsMiddleware(BaseHTTPMiddleware):
    """Middleware to track API usage for analytics."""
    
    async def dispatch(self, request: Request, call_next):
        # Only track chat endpoints
        if not request.url.path.startswith("/api/v1/chat"):
            return await call_next(request)
        
        # Don't track analytics endpoints themselves
        if "analytics" in request.url.path:
            return await call_next(request)
        
        start_time = time.time()
        
        # Store request data for later
        request.state.start_time = start_time
        
        # Process request
        response = await call_next(request)
        
        # Calculate response time
        response_time = time.time() - start_time
        
        # Track analytics in background (non-blocking)
        try:
            # Extract user_id from request state (set by auth middleware)
            user_id = getattr(request.state, "user_id", None)
            
            if user_id and response.status_code < 400:
                # Get request body data if available
                model_id = getattr(request.state, "model_id", "unknown")
                model_name = getattr(request.state, "model_name", "unknown")
                tokens_used = getattr(request.state, "tokens_used", 0)
                
                # Track in background (fire and forget)
                try:
                    db = mongodb_manager.get_database()
                    analytics_service = AnalyticsService(db)
                    
                    asyncio.create_task(
                        analytics_service.track_request(
                            user_id=user_id,
                            model_id=model_id,
                            model_name=model_name,
                            tokens_used=tokens_used,
                            response_time=response_time,
                            success=True
                        )
                    )
                    
                    logger.info(f"Analytics tracked: {user_id}, {model_id}, {response_time:.2f}s")
                except Exception as db_error:
                    logger.warning(f"Could not access database for analytics: {db_error}")
        
        except Exception as e:
            # Never let analytics break the response
            logger.error(f"Analytics tracking error: {e}")
        
        return response
