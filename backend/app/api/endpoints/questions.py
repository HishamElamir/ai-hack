import math
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.hr_employee import HREmployee
from app.models.new_hire import NewHire
from app.models.question import Question
from app.schemas.question import (
    QuestionListItem, QuestionDetail, AnswerQuestionRequest,
    QuestionUpdate, QuestionListResponse,
)

router = APIRouter(prefix="/questions", tags=["Questions"])


@router.get("")
async def list_questions(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status_filter: str = Query(None, alias="status"),
    priority: str = Query(None),
    new_hire_id: str = Query(None),
    db: Session = Depends(get_db),
    current_user: HREmployee = Depends(get_current_user),
):
    query = db.query(Question).filter(Question.deleted_at == None)

    if status_filter:
        query = query.filter(Question.status == status_filter)
    if priority:
        query = query.filter(Question.priority == priority)
    if new_hire_id:
        query = query.filter(Question.new_hire_id == new_hire_id)

    total = query.count()
    offset = (page - 1) * per_page
    questions = query.order_by(Question.asked_at.desc()).offset(offset).limit(per_page).all()

    items = []
    for q in questions:
        nh = db.query(NewHire).filter(NewHire.id == q.new_hire_id).first()
        items.append(QuestionListItem(
            id=str(q.id),
            new_hire_id=str(q.new_hire_id),
            new_hire_name=nh.full_name if nh else "Unknown",
            question=q.question,
            category=q.category,
            status=q.status,
            priority=q.priority,
            asked_at=q.asked_at,
            context=q.context,
        ))

    total_pages = math.ceil(total / per_page) if total > 0 else 1

    return {
        "data": items,
        "pagination": {
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1,
        },
    }


@router.get("/{question_id}", response_model=QuestionDetail)
async def get_question(
    question_id: str,
    db: Session = Depends(get_db),
    current_user: HREmployee = Depends(get_current_user),
):
    q = db.query(Question).filter(
        Question.id == question_id, Question.deleted_at == None
    ).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    nh = db.query(NewHire).filter(NewHire.id == q.new_hire_id).first()

    return QuestionDetail(
        id=str(q.id),
        new_hire={
            "id": str(nh.id) if nh else None,
            "full_name": nh.full_name if nh else "Unknown",
            "email": nh.email if nh else None,
            "position": nh.position if nh else None,
        },
        question=q.question,
        context=q.context,
        category=q.category,
        status=q.status,
        priority=q.priority,
        asked_at=q.asked_at,
        hr_response=q.hr_response,
        answered_at=q.answered_at,
        conversation={"id": str(q.conversation_id)} if q.conversation_id else None,
    )


@router.post("/{question_id}/answer")
async def answer_question(
    question_id: str,
    request: AnswerQuestionRequest,
    db: Session = Depends(get_db),
    current_user: HREmployee = Depends(get_current_user),
):
    q = db.query(Question).filter(
        Question.id == question_id, Question.deleted_at == None
    ).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    q.hr_response = request.response
    q.status = request.status
    q.responded_by = current_user.id
    q.answered_at = datetime.now(timezone.utc)

    db.commit()
    return {"message": "Question answered successfully"}


@router.patch("/{question_id}")
async def update_question(
    question_id: str,
    request: QuestionUpdate,
    db: Session = Depends(get_db),
    current_user: HREmployee = Depends(get_current_user),
):
    q = db.query(Question).filter(
        Question.id == question_id, Question.deleted_at == None
    ).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(q, field, value)

    db.commit()
    return {"message": "Question updated successfully"}
