from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class QuestionListItem(BaseModel):
    id: str
    new_hire_id: str
    new_hire_name: str
    question: str
    category: Optional[str] = None
    status: str
    priority: str
    asked_at: datetime
    context: Optional[str] = None

    class Config:
        from_attributes = True


class QuestionDetail(BaseModel):
    id: str
    new_hire: dict
    question: str
    context: Optional[str] = None
    category: Optional[str] = None
    status: str
    priority: str
    asked_at: datetime
    hr_response: Optional[str] = None
    answered_at: Optional[datetime] = None
    conversation: Optional[dict] = None

    class Config:
        from_attributes = True


class AnswerQuestionRequest(BaseModel):
    response: str
    status: str = "answered"
    send_notification: bool = True


class QuestionUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None


class QuestionListResponse(BaseModel):
    data: list[QuestionListItem]
    pagination: dict
