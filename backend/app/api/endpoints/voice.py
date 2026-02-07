from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.core.config import settings
from app.models.hr_employee import HREmployee
from app.models.new_hire import NewHire
from app.models.conversation import Conversation
from app.models.conversation_message import ConversationMessage
from app.models.question import Question
from app.schemas.voice import (
    InitializeSessionRequest, InitializeSessionResponse,
    VoiceConfigResponse, StoreMessageRequest,
    SubmitQuestionRequest, SubmitQuestionResponse,
    CompleteSessionRequest, TranscriptResponse,
)

router = APIRouter(prefix="/voice", tags=["Voice Agent"])


@router.post("/sessions/initialize", response_model=InitializeSessionResponse)
async def initialize_session(
    request: InitializeSessionRequest,
    db: Session = Depends(get_db),
):
    new_hire = db.query(NewHire).filter(
        NewHire.session_id == request.session_id,
        NewHire.deleted_at == None,
    ).first()
    if not new_hire:
        raise HTTPException(status_code=404, detail="Invalid session")

    if new_hire.session_expires_at and new_hire.session_expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Session expired")

    # Find or create conversation record
    conversation = db.query(Conversation).filter(
        Conversation.session_id == request.session_id
    ).first()
    
    if not conversation:
        conversation = Conversation(
            new_hire_id=new_hire.id,
            session_id=request.session_id,
            language=new_hire.preferred_language,
            start_time=datetime.now(timezone.utc),
            agent_id=settings.ELEVENLABS_AGENT_ID,
        )
        db.add(conversation)
        
        if new_hire.status == "draft" or new_hire.status == "invited":
            new_hire.status = "in_progress"
        if not new_hire.voice_session_started_at:
            new_hire.voice_session_started_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(conversation)

    benefits = [
        {"type": b.benefit_type, "description": b.description, "value": float(b.value) if b.value else None}
        for b in new_hire.benefits if not b.deleted_at
    ]

    # Generate signed URL for ElevenLabs
    signed_url = None
    if settings.ELEVENLABS_API_KEY and settings.ELEVENLABS_AGENT_ID:
        try:
            import httpx
            response = httpx.get(
                f"https://api.elevenlabs.io/v1/convai/conversation/get-signed-url",
                params={"agent_id": settings.ELEVENLABS_AGENT_ID},
                headers={"xi-api-key": settings.ELEVENLABS_API_KEY},
                timeout=10.0,
            )
            if response.status_code == 200:
                signed_url = response.json().get("signed_url")
        except Exception as e:
            print(f"Failed to get signed URL: {e}")

    return InitializeSessionResponse(
        conversation_id=str(conversation.id),
        new_hire={
            "id": str(new_hire.id),
            "full_name": new_hire.full_name,
            "preferred_language": new_hire.preferred_language,
        },
        agent_config={
            "agent_id": settings.ELEVENLABS_AGENT_ID or "demo_agent",
            "language": new_hire.preferred_language,
            "voice_id": "professional_male_voice",
            "signed_url": signed_url,
        },
        conversation_context={
            "position": new_hire.position,
            "department": new_hire.department,
            "salary": float(new_hire.salary) if new_hire.salary is not None else None,
            "currency": new_hire.currency,
            "start_date": new_hire.start_date.isoformat() if new_hire.start_date else None,
            "benefits": benefits,
            "has_benefits": len(benefits) > 0,
            "has_contracts": len(new_hire.contracts) > 0,
        },
    )


@router.get("/config/{session_id}", response_model=VoiceConfigResponse)
async def get_voice_config(session_id: str, db: Session = Depends(get_db)):
    new_hire = db.query(NewHire).filter(
        NewHire.session_id == session_id, NewHire.deleted_at == None
    ).first()
    if not new_hire:
        raise HTTPException(status_code=404, detail="Invalid session")

    system_prompt = f"""You are a warm, enthusiastic HR onboarding assistant helping {new_hire.full_name} understand their job offer and benefits.
Position: {new_hire.position}
Department: {new_hire.department}
Salary: {new_hire.salary} {new_hire.currency}
Start Date: {new_hire.start_date}
"""

    return VoiceConfigResponse(
        agent_id=settings.ELEVENLABS_AGENT_ID or "demo_agent",
        language=new_hire.preferred_language,
        voice_settings={
            "voice_id": "professional_male_voice",
            "stability": 0.5,
            "similarity_boost": 0.75,
        },
        conversation_starters=[
            f"Welcome to the team, {new_hire.full_name}! I'm here to walk you through your offer.",
            f"مرحباً {new_hire.full_name}! أنا هنا لمساعدتك في فهم عرض العمل.",
        ],
        system_prompt=system_prompt,
    )


@router.post("/conversations/{conversation_id}/messages")
async def store_message(
    conversation_id: str,
    request: StoreMessageRequest,
    db: Session = Depends(get_db),
):
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    msg_count = db.query(ConversationMessage).filter(
        ConversationMessage.conversation_id == conversation_id
    ).count()

    message = ConversationMessage(
        conversation_id=conversation.id,
        speaker=request.speaker,
        message=request.message,
        audio_url=request.audio_url,
        audio_duration_seconds=request.audio_duration_seconds,
        timestamp=request.timestamp or datetime.now(timezone.utc),
        sequence_number=msg_count + 1,
    )
    db.add(message)
    db.commit()

    return {"message": "Message stored successfully"}


@router.post("/conversations/{conversation_id}/questions", response_model=SubmitQuestionResponse)
async def submit_question(
    conversation_id: str,
    request: SubmitQuestionRequest,
    db: Session = Depends(get_db),
):
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    question = Question(
        new_hire_id=conversation.new_hire_id,
        conversation_id=conversation.id,
        question=request.question,
        context=request.context,
        priority=request.priority,
        status="pending",
    )
    db.add(question)
    db.commit()
    db.refresh(question)

    return SubmitQuestionResponse(
        id=str(question.id),
        question=question.question,
        status=question.status,
        message="I've noted your question and our HR team will get back to you within 24 hours.",
    )


@router.post("/conversations/{conversation_id}/complete")
async def complete_session(
    conversation_id: str,
    request: CompleteSessionRequest,
    db: Session = Depends(get_db),
):
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conversation.end_time = datetime.now(timezone.utc)
    conversation.completion_status = request.completion_status
    conversation.summary = request.summary
    conversation.sentiment_score = request.sentiment_score
    conversation.engagement_score = request.engagement_score

    if conversation.start_time:
        duration = (conversation.end_time - conversation.start_time).total_seconds()
        conversation.duration_seconds = int(duration)

    new_hire = db.query(NewHire).filter(NewHire.id == conversation.new_hire_id).first()
    if new_hire:
        new_hire.voice_session_completed = True
        new_hire.voice_session_completed_at = datetime.now(timezone.utc)
        if request.offer_accepted:
            new_hire.offer_accepted = True
            new_hire.offer_accepted_at = datetime.now(timezone.utc)
            new_hire.status = "offer_presented"

    db.commit()
    return {"message": "Session completed successfully"}


@router.post("/conversations/{conversation_id}/link-elevenlabs")
async def link_elevenlabs_conversation(
    conversation_id: str,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
):
    elevenlabs_conversation_id = payload.get("elevenlabs_conversation_id")
    if not elevenlabs_conversation_id:
        raise HTTPException(status_code=400, detail="Missing elevenlabs_conversation_id")

    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conversation.elevenlabs_conversation_id = elevenlabs_conversation_id
    db.commit()
    return {"message": "Conversation linked"}


@router.get("/conversations/{conversation_id}/transcript", response_model=TranscriptResponse)
async def get_transcript(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: HREmployee = Depends(get_current_user),
):
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    new_hire = db.query(NewHire).filter(NewHire.id == conversation.new_hire_id).first()
    messages = db.query(ConversationMessage).filter(
        ConversationMessage.conversation_id == conversation_id
    ).order_by(ConversationMessage.sequence_number).all()

    return TranscriptResponse(
        conversation_id=str(conversation.id),
        new_hire_name=new_hire.full_name if new_hire else "Unknown",
        start_time=conversation.start_time,
        end_time=conversation.end_time,
        duration_seconds=conversation.duration_seconds,
        language=conversation.language,
        messages=[{
            "speaker": m.speaker,
            "message": m.message,
            "timestamp": m.timestamp.isoformat() if m.timestamp else None,
            "audio_url": m.audio_url,
        } for m in messages],
        full_transcript=conversation.full_transcript,
        summary=conversation.summary,
        sentiment_score=float(conversation.sentiment_score) if conversation.sentiment_score else None,
    )
