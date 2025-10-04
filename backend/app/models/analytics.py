"""Analytics models for tracking usage statistics."""
from datetime import datetime
from typing import Optional, Dict, List
from pydantic import BaseModel, Field


class UsageStats(BaseModel):
    """User usage statistics."""
    user_id: str
    date: str  # YYYY-MM-DD format
    total_requests: int = 0
    total_tokens: int = 0
    models_used: Dict[str, int] = Field(default_factory=dict)  # model_id: count
    avg_response_time: float = 0.0
    total_response_time: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ModelUsageEntry(BaseModel):
    """Single model usage entry."""
    model_id: str
    model_name: str
    request_count: int
    total_tokens: int
    avg_response_time: float
    last_used: datetime


class TokenUsageEntry(BaseModel):
    """Token usage over time."""
    date: str  # YYYY-MM-DD format
    total_tokens: int
    by_model: Dict[str, int] = Field(default_factory=dict)


class ResponseTimeEntry(BaseModel):
    """Response time metrics."""
    timestamp: datetime
    model_id: str
    response_time: float
    success: bool


class AnalyticsDocument(BaseModel):
    """Complete analytics document stored in MongoDB."""
    user_id: str
    period: str  # daily, weekly, monthly
    start_date: str
    end_date: str
    total_requests: int = 0
    total_tokens: int = 0
    total_errors: int = 0
    models_used: List[ModelUsageEntry] = Field(default_factory=list)
    token_usage: List[TokenUsageEntry] = Field(default_factory=list)
    response_times: List[ResponseTimeEntry] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AnalyticsSummary(BaseModel):
    """Summary analytics response."""
    total_requests: int
    total_tokens: int
    total_sessions: int
    avg_response_time: float
    most_used_model: Optional[str] = None
    model_usage: List[ModelUsageEntry]
    token_usage_trend: List[TokenUsageEntry]
    response_time_trend: List[ResponseTimeEntry]
    period: str
    start_date: str
    end_date: str
