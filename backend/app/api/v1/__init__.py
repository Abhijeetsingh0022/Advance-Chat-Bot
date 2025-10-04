"""API v1 router aggregation"""
from fastapi import APIRouter
from app.api.v1.endpoints import auth, chat, admin, health, settings, analytics

api_router = APIRouter()

# Include all endpoint routers (tags already defined in individual routers)
api_router.include_router(auth.router)
api_router.include_router(chat.router)
api_router.include_router(admin.router)
api_router.include_router(health.router)
api_router.include_router(settings.router)
api_router.include_router(analytics.router)
