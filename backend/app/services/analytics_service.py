"""Analytics service for tracking usage statistics."""
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.analytics import (
    UsageStats,
    AnalyticsDocument,
    AnalyticsSummary,
    ModelUsageEntry,
    TokenUsageEntry,
    ResponseTimeEntry
)

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Service for collecting and retrieving analytics data."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.analytics
    
    async def track_request(
        self,
        user_id: str,
        model_id: str,
        model_name: str,
        tokens_used: int,
        response_time: float,
        success: bool = True
    ):
        """Track a single request for analytics."""
        try:
            date_str = datetime.utcnow().strftime("%Y-%m-%d")
            
            # Upsert daily stats
            await self.collection.update_one(
                {"user_id": user_id, "date": date_str},
                {
                    "$inc": {
                        "total_requests": 1,
                        "total_tokens": tokens_used,
                        f"models_used.{model_id}": 1,
                        "total_response_time": response_time
                    },
                    "$setOnInsert": {
                        "created_at": datetime.utcnow()
                    },
                    "$set": {
                        "updated_at": datetime.utcnow()
                    }
                },
                upsert=True
            )
            
            # Calculate and update average response time
            stats = await self.collection.find_one({"user_id": user_id, "date": date_str})
            if stats:
                avg_time = stats["total_response_time"] / stats["total_requests"]
                await self.collection.update_one(
                    {"user_id": user_id, "date": date_str},
                    {"$set": {"avg_response_time": avg_time}}
                )
            
            logger.info(f"Tracked request for user {user_id}: {model_id}, {tokens_used} tokens, {response_time}s")
        
        except Exception as e:
            logger.error(f"Error tracking analytics: {e}")
    
    async def get_summary(
        self,
        user_id: str,
        period: str = "week",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> AnalyticsSummary:
        """Get analytics summary for a user."""
        try:
            # Calculate date range
            if not start_date or not end_date:
                end = datetime.utcnow()
                if period == "day":
                    start = end
                elif period == "week":
                    start = end - timedelta(days=7)
                elif period == "month":
                    start = end - timedelta(days=30)
                elif period == "year":
                    start = end - timedelta(days=365)
                else:
                    start = end - timedelta(days=7)
                
                start_date = start.strftime("%Y-%m-%d")
                end_date = end.strftime("%Y-%m-%d")
            
            # Query analytics data
            cursor = self.collection.find({
                "user_id": user_id,
                "date": {"$gte": start_date, "$lte": end_date}
            })
            
            stats_list = await cursor.to_list(length=None)
            
            if not stats_list:
                return AnalyticsSummary(
                    total_requests=0,
                    total_tokens=0,
                    total_sessions=0,
                    avg_response_time=0.0,
                    model_usage=[],
                    token_usage_trend=[],
                    response_time_trend=[],
                    period=period,
                    start_date=start_date,
                    end_date=end_date
                )
            
            # Aggregate data
            total_requests = sum(s["total_requests"] for s in stats_list)
            total_tokens = sum(s["total_tokens"] for s in stats_list)
            total_response_time = sum(s.get("total_response_time", 0) for s in stats_list)
            avg_response_time = total_response_time / total_requests if total_requests > 0 else 0.0
            
            # Model usage
            model_usage_dict: Dict[str, Dict] = {}
            for stats in stats_list:
                for model_id, count in stats.get("models_used", {}).items():
                    if model_id not in model_usage_dict:
                        model_usage_dict[model_id] = {
                            "model_id": model_id,
                            "model_name": model_id.split("/")[-1] if "/" in model_id else model_id,
                            "request_count": 0,
                            "total_tokens": 0,
                            "total_time": 0.0
                        }
                    model_usage_dict[model_id]["request_count"] += count
                    # Approximate token distribution
                    model_usage_dict[model_id]["total_tokens"] += int(total_tokens * count / total_requests)
            
            # Create model usage entries
            model_usage = []
            for model_data in model_usage_dict.values():
                avg_time = model_data["total_time"] / model_data["request_count"] if model_data["request_count"] > 0 else 0.0
                model_usage.append(ModelUsageEntry(
                    model_id=model_data["model_id"],
                    model_name=model_data["model_name"],
                    request_count=model_data["request_count"],
                    total_tokens=model_data["total_tokens"],
                    avg_response_time=avg_time,
                    last_used=datetime.utcnow()
                ))
            
            # Sort by request count
            model_usage.sort(key=lambda x: x.request_count, reverse=True)
            most_used_model = model_usage[0].model_name if model_usage else None
            
            # Token usage trend
            token_usage_trend = [
                TokenUsageEntry(
                    date=s["date"],
                    total_tokens=s["total_tokens"],
                    by_model=s.get("models_used", {})
                )
                for s in stats_list
            ]
            token_usage_trend.sort(key=lambda x: x.date)
            
            # Response time trend
            response_time_trend = [
                ResponseTimeEntry(
                    timestamp=s.get("updated_at", datetime.utcnow()),
                    model_id="aggregate",
                    response_time=s.get("avg_response_time", 0.0),
                    success=True
                )
                for s in stats_list
            ]
            response_time_trend.sort(key=lambda x: x.timestamp)
            
            # Count unique sessions (approximate from MongoDB sessions collection)
            sessions_count = await self.db.sessions.count_documents({
                "user_id": user_id,
                "created_at": {
                    "$gte": datetime.strptime(start_date, "%Y-%m-%d"),
                    "$lte": datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
                }
            })
            
            return AnalyticsSummary(
                total_requests=total_requests,
                total_tokens=total_tokens,
                total_sessions=sessions_count,
                avg_response_time=round(avg_response_time, 2),
                most_used_model=most_used_model,
                model_usage=model_usage,
                token_usage_trend=token_usage_trend,
                response_time_trend=response_time_trend,
                period=period,
                start_date=start_date,
                end_date=end_date
            )
        
        except Exception as e:
            logger.error(f"Error getting analytics summary: {e}")
            raise
    
    async def get_model_comparison(self, user_id: str, days: int = 30) -> List[ModelUsageEntry]:
        """Get model usage comparison."""
        try:
            end_date = datetime.utcnow().strftime("%Y-%m-%d")
            start_date = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
            
            summary = await self.get_summary(user_id, "custom", start_date, end_date)
            return summary.model_usage
        
        except Exception as e:
            logger.error(f"Error getting model comparison: {e}")
            return []
