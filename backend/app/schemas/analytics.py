from pydantic import BaseModel
from typing import Optional


class OverviewAnalytics(BaseModel):
    time_period: dict
    metrics: dict
    trends: dict


class ConversationAnalytics(BaseModel):
    total_conversations: int
    average_duration_seconds: float
    completion_rate: float
    average_sentiment: float
    average_engagement: float
    by_language: dict
    common_questions: list
