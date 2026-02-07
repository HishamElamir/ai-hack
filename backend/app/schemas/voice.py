from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class InitializeSessionRequest(BaseModel):
    session_id: str


class InitializeSessionResponse(BaseModel):
    conversation_id: str
    new_hire: dict
    agent_config: dict
    conversation_context: dict


class VoiceConfigResponse(BaseModel):
    agent_id: str
    language: str
    voice_settings: dict
    conversation_starters: list[str]
    system_prompt: str


class StoreMessageRequest(BaseModel):
    speaker: str
    message: str
    audio_url: Optional[str] = None
    audio_duration_seconds: Optional[float] = None
    timestamp: Optional[datetime] = None


class SubmitQuestionRequest(BaseModel):
    question: str
    context: Optional[str] = None
    priority: str = "normal"


class SubmitQuestionResponse(BaseModel):
    id: str
    question: str
    status: str
    message: str


class CompleteSessionRequest(BaseModel):
    completion_status: str
    summary: Optional[str] = None
    sentiment_score: Optional[float] = None
    engagement_score: Optional[float] = None
    offer_accepted: Optional[bool] = None


class TranscriptResponse(BaseModel):
    conversation_id: str
    new_hire_name: str
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    language: str
    messages: list
    full_transcript: Optional[str] = None
    summary: Optional[str] = None
    sentiment_score: Optional[float] = None
