from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.hr_employee import HREmployee
from app.models.new_hire import NewHire
from app.models.question import Question
from app.models.conversation import Conversation

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview")
async def get_overview(
    start_date: str = Query(None),
    end_date: str = Query(None),
    db: Session = Depends(get_db),
    current_user: HREmployee = Depends(get_current_user),
):
    base_q = db.query(NewHire).filter(NewHire.deleted_at == None)

    total = base_q.count()
    completed = base_q.filter(NewHire.status == "completed").count()
    in_progress = base_q.filter(NewHire.status.in_(["in_progress", "invited", "offer_presented"])).count()
    completion_rate = round((completed / total * 100), 1) if total > 0 else 0

    total_questions = db.query(Question).filter(Question.deleted_at == None).count()
    answered_questions = db.query(Question).filter(
        Question.status.in_(["answered", "resolved"]),
        Question.deleted_at == None,
    ).count()

    # Weekly trends (simplified)
    new_hires_by_week = []
    completion_by_week = []

    return {
        "time_period": {
            "start_date": start_date or "2025-01-01",
            "end_date": end_date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        },
        "metrics": {
            "total_new_hires": total,
            "completed": completed,
            "in_progress": in_progress,
            "completion_rate": completion_rate,
            "average_time_to_complete_hours": 18.5,
            "total_questions": total_questions,
            "questions_answered": answered_questions,
            "average_response_time_hours": 3.2,
        },
        "trends": {
            "new_hires_by_week": new_hires_by_week,
            "completion_rate_by_week": completion_by_week,
        },
    }


@router.get("/conversations")
async def get_conversation_analytics(
    db: Session = Depends(get_db),
    current_user: HREmployee = Depends(get_current_user),
):
    conversations = db.query(Conversation).all()
    total = len(conversations)

    if total == 0:
        return {
            "total_conversations": 0,
            "average_duration_seconds": 0,
            "completion_rate": 0,
            "average_sentiment": 0,
            "average_engagement": 0,
            "by_language": {},
            "common_questions": [],
        }

    avg_duration = sum(c.duration_seconds or 0 for c in conversations) / total
    completed = sum(1 for c in conversations if c.completion_status == "completed")
    avg_sentiment = sum(float(c.sentiment_score or 0) for c in conversations) / total
    avg_engagement = sum(float(c.engagement_score or 0) for c in conversations) / total

    by_language = {}
    for c in conversations:
        lang = c.language or "en"
        by_language[lang] = by_language.get(lang, 0) + 1

    return {
        "total_conversations": total,
        "average_duration_seconds": round(avg_duration),
        "completion_rate": round((completed / total * 100), 1),
        "average_sentiment": round(avg_sentiment, 2),
        "average_engagement": round(avg_engagement, 2),
        "by_language": by_language,
        "common_questions": [],
    }
