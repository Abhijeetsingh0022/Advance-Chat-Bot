import logging
import time
from datetime import datetime
from typing import Dict, Any
from fastapi import APIRouter
from app.services.ai_provider import provider_manager
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/")
def health_check() -> Dict[str, Any]:
    """Basic health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "ChatBot API",
        "version": "1.0.0"
    }


@router.get("/detailed")
async def detailed_health_check() -> Dict[str, Any]:
    """Detailed health check with component status."""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "ChatBot API",
        "version": "1.0.0",
        "checks": {}
    }

    # MongoDB check (Atlas for auth and chat storage)
    try:
        from app.db.mongodb import mongodb_manager
        if settings.MONGO_URI:
            start_time = time.time()
            mongo_healthy = await mongodb_manager.health_check()
            mongo_time = time.time() - start_time
            
            if mongo_healthy:
                # Get collection stats
                try:
                    db_instance = mongodb_manager.get_database()
                    users_count = await db_instance.users.count_documents({})
                    sessions_count = await db_instance.sessions.count_documents({})
                    messages_count = await db_instance.messages.count_documents({})
                    
                    health_status["checks"]["mongodb"] = {
                        "status": "healthy",
                        "type": "MongoDB Atlas",
                        "purpose": "Auth & Chat Storage",
                        "configured": True,
                        "connected": True,
                        "response_time": f"{mongo_time:.3f}s",
                        "stats": {
                            "users": users_count,
                            "sessions": sessions_count,
                            "messages": messages_count
                        }
                    }
                except Exception:
                    health_status["checks"]["mongodb"] = {
                        "status": "healthy",
                        "type": "MongoDB Atlas",
                        "purpose": "Auth & Chat Storage",
                        "configured": True,
                        "connected": True,
                        "response_time": f"{mongo_time:.3f}s"
                    }
            else:
                health_status["checks"]["mongodb"] = {
                    "status": "unhealthy",
                    "type": "MongoDB Atlas",
                    "purpose": "Auth & Chat Storage",
                    "configured": True,
                    "connected": False,
                    "message": "Connection failed or circuit breaker is open"
                }
                health_status["status"] = "degraded"
        else:
            health_status["checks"]["mongodb"] = {
                "status": "not_configured",
                "type": "MongoDB Atlas",
                "purpose": "Auth & Chat Storage",
                "configured": False,
                "connected": False
            }
            health_status["status"] = "unhealthy"
    except Exception as e:
        logger.error(f"MongoDB health check failed: {e}")
        health_status["checks"]["mongodb"] = {
            "status": "unhealthy",
            "type": "MongoDB Atlas",
            "purpose": "Auth & Chat Storage",
            "configured": True,
            "connected": False,
            "error": str(e)
        }
        health_status["status"] = "unhealthy"

    # AI Providers check
    try:
        provider_status = {}
        total_providers = 0

        for category, providers in provider_manager.providers.items():
            provider_status[category] = {
                "total": len(providers),
                "configured": len([p for p in providers if not hasattr(p, 'generate') or 'mock' not in str(type(p)).lower()])
            }
            total_providers += len(providers)

        health_status["checks"]["ai_providers"] = {
            "status": "healthy" if total_providers > 0 else "degraded",
            "categories": provider_status,
            "total_providers": total_providers
        }

        if total_providers == 0:
            health_status["status"] = "degraded"

    except Exception as e:
        logger.error(f"AI providers health check failed: {e}")
        health_status["checks"]["ai_providers"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        health_status["status"] = "unhealthy"

    # Configuration check
    try:
        config_issues = []

        # Check if essential environment variables are set
        required_configs = [
            'SECRET_KEY',
            'MONGO_URI'
        ]

        for config in required_configs:
            if not hasattr(settings, config) or not getattr(settings, config):
                config_issues.append(f"Missing or empty: {config}")

        # Check if at least one AI provider is configured
        ai_configs = [
            'AI_SERVICES__OPEN_ROUTER_API_KEY_XAI',
            'AI_SERVICES__OPEN_ROUTER_API_KEY_DEEPSEEK',
            'AI_SERVICES__OPEN_ROUTER_API_KEY_GPT_OSS',
            'AI_SERVICES__GROQ_API_KEY',
            'AI_SERVICES__GEMINI_API_KEY'
        ]

        ai_configured = any(
            hasattr(settings, config) and getattr(settings, config)
            for config in ai_configs
        )

        if not ai_configured:
            config_issues.append("No AI providers configured")

        health_status["checks"]["configuration"] = {
            "status": "healthy" if not config_issues else "degraded",
            "issues": config_issues
        }

        if config_issues:
            health_status["status"] = "degraded"

    except Exception as e:
        logger.error(f"Configuration health check failed: {e}")
        health_status["checks"]["configuration"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        health_status["status"] = "degraded"

    return health_status


@router.get("/providers")
def provider_health_check() -> Dict[str, Any]:
    """Check status of AI providers."""
    try:
        provider_info = {}

        for category, providers in provider_manager.providers.items():
            category_info = []
            for provider in providers:
                provider_data = {
                    "name": getattr(provider, 'name', 'unknown'),
                    "model": getattr(provider, 'model', 'unknown'),
                    "type": type(provider).__name__
                }
                category_info.append(provider_data)

            provider_info[category] = category_info

        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "providers": provider_info,
            "total_categories": len(provider_info),
            "total_providers": sum(len(providers) for providers in provider_info.values())
        }
    except Exception as e:
        logger.error(f"Provider health check failed: {e}")
        return {
            "status": "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e)
        }