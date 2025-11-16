"""
Advanced Chat Bot API - Main Application
FastAPI application with modern architecture
"""
import logging
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from fastapi.openapi.utils import get_openapi
from dotenv import load_dotenv

# Load environment variables first
load_dotenv()

from app.core.config import settings
from app.db.mongodb import init_mongodb, close_mongodb
from app.api.v1 import api_router
from app.utils.exceptions import ChatBotException
from app.schemas.error import ErrorResponse, ValidationErrorResponse, ValidationErrorDetail
from app.middleware.rate_limit import limiter, EndpointRateLimitMiddleware
from app.middleware.analytics import AnalyticsMiddleware
from slowapi.errors import RateLimitExceeded

# Configure logging with simple format (request_id added in middleware)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)-8s | %(name)-20s | %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("app.log", mode="a")
    ]
)

# Configure third-party loggers
logging.getLogger('alembic').setLevel(logging.WARNING)
logging.getLogger('sqlalchemy').setLevel(logging.WARNING)
logging.getLogger('motor').setLevel(logging.WARNING)
logging.getLogger('pymongo').setLevel(logging.WARNING)
logging.getLogger('uvicorn').setLevel(logging.INFO)
logging.getLogger('uvicorn.access').setLevel(logging.INFO)
logging.getLogger('slowapi').setLevel(logging.INFO)

logger = logging.getLogger(__name__)


# Custom logging filter to inject request_id (applied per request in middleware)
class RequestIdFilter(logging.Filter):
    def __init__(self, request_id: str):
        super().__init__()
        self.request_id = request_id
    
    def filter(self, record):
        record.request_id = self.request_id
        return True


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting up application...")
    try:
        # Initialize MongoDB (required for auth and chat)
        if settings.MONGO_URI:
            try:
                await init_mongodb()
                logger.info("MongoDB initialized successfully.")
            except Exception as mongo_error:
                logger.error(f"Failed to initialize MongoDB: {mongo_error}")
                raise  # MongoDB is now required
        else:
            logger.error("MongoDB not configured - MONGO_URI is required")
            raise RuntimeError("MongoDB URI must be configured")
        
        # Start background scheduler for memory maintenance
        try:
            from app.utils.scheduler import background_scheduler
            background_scheduler.start()
            background_scheduler.schedule_memory_maintenance()
            logger.info("Background scheduler started with memory maintenance tasks")
        except Exception as scheduler_error:
            logger.warning(f"Failed to start background scheduler: {scheduler_error}")
            # Non-critical, continue without scheduler
        
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down application...")
    
    # Shutdown scheduler
    try:
        from app.utils.scheduler import background_scheduler
        background_scheduler.shutdown()
        logger.info("Background scheduler stopped")
    except Exception:
        pass
    
    await close_mongodb()
    logger.info("Application shutdown complete.")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application"""
    
    app = FastAPI(
        title="Advanced Chat Bot API",
        description="A secure chat bot API with authentication and AI integration",
        version="1.0.0",
        lifespan=lifespan
    )

    # Configure CORS with dynamic localhost port support
    allowed_origins = [origin.strip() for origin in settings.FRONTEND_ORIGINS.split(',') if origin.strip()]
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_origin_regex=r"https?://(localhost|127\.0\.0\.1):\d+",  # Allow any localhost port
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Add rate limiting middleware
    app.add_middleware(EndpointRateLimitMiddleware)

    # Add analytics middleware
    app.add_middleware(AnalyticsMiddleware)

    # Request logging middleware
    @app.middleware('http')
    async def log_requests(request: Request, call_next):
        import time
        start = time.time()

        # Generate unique request ID
        request_id = str(uuid.uuid4())[:8]
        request.state.request_id = request_id

        # Get client information
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")

        # Get request details
        method = request.method
        path = request.url.path
        query_params = str(request.url.query) if request.url.query else ""

        # Log incoming request
        logger.info(
            f"API REQUEST: {method} {path} | IP: {client_ip} | UA: {user_agent[:50]}... | Query: {query_params}",
            extra={'request_id': request_id}
        )

        response = await call_next(request)
        duration = (time.time() - start) * 1000

        # Log response
        logger.info(
            f"API RESPONSE: {method} {path} -> {response.status_code} ({duration:.0f}ms)",
            extra={'request_id': request_id}
        )

        return response

    # Include API routers
    app.include_router(api_router, prefix="/api")

    # Global exception handlers
    @app.exception_handler(ChatBotException)
    async def chatbot_exception_handler(request: Request, exc: ChatBotException):
        request_id = getattr(request.state, 'request_id', 'no-request-id')
        logger.error(
            f"ChatBot exception: {exc.detail} (code: {exc.error_code})",
            extra={'request_id': request_id}
        )
        # If this is a validation error raised by our custom ValidationError
        # return the structured ValidationErrorResponse so frontend can show field-level errors.
        try:
            if getattr(exc, 'error_code', None) == 'VALIDATION_ERROR':
                # The custom ValidationError often contains a semicolon-separated
                # list of issue messages (e.g. "Password must contain...; Password must ...").
                detail_text = str(exc.detail or '')
                parts = [p.strip() for p in detail_text.split(';') if p.strip()]
                errors = []
                for p in parts:
                    # Try to infer field name when possible
                    field = 'password' if 'password' in p.lower() else ''
                    errors.append(ValidationErrorDetail(field=field, message=p))

                return JSONResponse(
                    status_code=exc.status_code,
                    content=ValidationErrorResponse(
                        error='validation_error',
                        message='Input validation failed',
                        error_code='VALIDATION_ERROR',
                        errors=errors
                    ).dict(),
                    headers=exc.headers
                )
        except Exception:
            # Fall through to the generic error formatting if anything goes wrong
            logger.exception('Failed to format validation error')

        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error="application_error",
                message=exc.detail,
                error_code=exc.error_code
            ).dict(),
            headers=exc.headers
        )

    @app.exception_handler(ValidationError)
    async def validation_exception_handler(request: Request, exc: ValidationError):
        request_id = getattr(request.state, 'request_id', 'no-request-id')
        logger.warning(f"Validation error: {exc}", extra={'request_id': request_id})
        errors = []
        for error in exc.errors():
            errors.append(ValidationErrorDetail(
                field=".".join(str(loc) for loc in error["loc"]),
                message=error["msg"],
                value=error.get("ctx", {}).get("given") if error.get("ctx") else None
            ))

        return JSONResponse(
            status_code=422,
            content=ValidationErrorResponse(
                error="validation_error",
                message="Input validation failed",
                error_code="VALIDATION_ERROR",
                errors=errors
            ).dict()
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        request_id = getattr(request.state, 'request_id', 'no-request-id')
        logger.warning(
            f"HTTP exception: {exc.detail} (status: {exc.status_code})",
            extra={'request_id': request_id}
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error="http_error",
                message=exc.detail
            ).dict(),
            headers=exc.headers
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        request_id = getattr(request.state, 'request_id', 'no-request-id')
        logger.error(
            f"Unexpected error: {str(exc)}",
            exc_info=True,
            extra={'request_id': request_id}
        )
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                error="internal_server_error",
                message="An unexpected error occurred",
                error_code="INTERNAL_ERROR"
            ).dict()
        )

    @app.exception_handler(RateLimitExceeded)
    async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
        request_id = getattr(request.state, 'request_id', 'no-request-id')
        logger.warning(f"Rate limit exceeded", extra={'request_id': request_id})
        return JSONResponse(
            status_code=429,
            content=ErrorResponse(
                error="rate_limit_exceeded",
                message="Too many requests. Please try again later.",
                error_code="RATE_LIMIT"
            ).dict(),
            headers={"Retry-After": "60"}
        )

    logger.info("FastAPI app created with middleware, routers, and exception handlers.")

    # Custom OpenAPI schema
    def custom_openapi():
        if app.openapi_schema:
            return app.openapi_schema
        
        openapi_schema = get_openapi(
            title=app.title,
            version=app.version,
            description=app.description,
            routes=app.routes,
        )
        
        openapi_schema.setdefault("components", {})
        openapi_schema["components"]["securitySchemes"] = {
            "BearerAuth": {
                "type": "http",
                "scheme": "bearer",
                "bearerFormat": "JWT",
                "description": "Enter your JWT token. No OAuth flow required."
            }
        }
        
        # Remove operation-level security
        for path_item in openapi_schema.get("paths", {}).values():
            for operation in path_item.values():
                if isinstance(operation, dict) and "security" in operation:
                    operation.pop("security", None)
        
        # Apply global security
        openapi_schema["security"] = [{"BearerAuth": []}]
        app.openapi_schema = openapi_schema
        return app.openapi_schema

    app.openapi = custom_openapi

    return app


# Create application instance
app = create_app()


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Advanced Chat Bot API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "redoc": "/redoc"
    }
