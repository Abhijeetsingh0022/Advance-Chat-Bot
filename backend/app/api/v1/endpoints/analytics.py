"""Analytics API endpoints."""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.core.deps import get_current_user
from app.services.analytics_service import AnalyticsService
from app.db.mongodb import mongodb_manager
from app.models.analytics import AnalyticsSummary, ModelUsageEntry

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["analytics"])


async def get_analytics_service() -> AnalyticsService:
    """Dependency to get analytics service."""
    db = mongodb_manager.get_database()
    return AnalyticsService(db)


@router.get("/summary", response_model=AnalyticsSummary)
async def get_analytics_summary(
    period: str = Query("week", regex="^(day|week|month|year)$"),
    start_date: Optional[str] = Query(None, regex=r"^\d{4}-\d{2}-\d{2}$"),
    end_date: Optional[str] = Query(None, regex=r"^\d{4}-\d{2}-\d{2}$"),
    user_id: str = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """
    Get analytics summary for the current user.
    
    - **period**: Time period (day, week, month, year)
    - **start_date**: Optional start date (YYYY-MM-DD)
    - **end_date**: Optional end date (YYYY-MM-DD)
    """
    try:
        summary = await analytics_service.get_summary(
            user_id=user_id,
            period=period,
            start_date=start_date,
            end_date=end_date
        )
        return summary
    
    except Exception as e:
        logger.error(f"Error getting analytics summary: {e}")
        raise


@router.get("/models", response_model=list[ModelUsageEntry])
async def get_model_usage(
    days: int = Query(30, ge=1, le=365),
    user_id: str = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """
    Get model usage comparison for the last N days.
    
    - **days**: Number of days to analyze (1-365)
    """
    try:
        models = await analytics_service.get_model_comparison(user_id, days)
        return models
    
    except Exception as e:
        logger.error(f"Error getting model usage: {e}")
        raise
