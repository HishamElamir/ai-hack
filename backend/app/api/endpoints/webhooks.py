from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.conversation import Conversation
from app.models.conversation_message import ConversationMessage
from app.models.question import Question
from app.services.question_extractor import extract_questions_from_transcript


router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/elevenlabs")
async def handle_elevenlabs_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    if not settings.ELEVENLABS_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Webhook secret not configured")

    payload = await request.body()
    signature = request.headers.get("elevenlabs-signature")
    if not signature:
        raise HTTPException(status_code=401, detail="Missing webhook signature")

    try:
        from elevenlabs.client import ElevenLabs
    except Exception as exc:
        raise HTTPException(status_code=500, detail="ElevenLabs SDK not available") from exc

    client = ElevenLabs(api_key=settings.ELEVENLABS_API_KEY or "")

    try:
        event = client.webhooks.construct_event(
            payload=payload.decode("utf-8"),
            signature=signature,
            secret=settings.ELEVENLABS_WEBHOOK_SECRET,
        )
    except Exception as exc:
        print(exc)
        raise HTTPException(status_code=401, detail="Invalid webhook signature") from exc

    event_dict = _as_dict(event)
    event_type = event_dict.get("type") or getattr(event, "type", None)
    data = event_dict.get("data") or _as_dict(getattr(event, "data", None))

    if event_type != "post_call_transcription":
        return {"status": "ignored"}

    conversation = _resolve_conversation(db, data)
    if not conversation:
        return {"status": "ignored"}

    elevenlabs_conversation_id = data.get("conversation_id")
    if elevenlabs_conversation_id and not conversation.elevenlabs_conversation_id:
        conversation.elevenlabs_conversation_id = elevenlabs_conversation_id

    metadata = data.get("metadata") or {}
    analysis = data.get("analysis") or {}
    transcript = data.get("transcript") or []

    if metadata.get("start_time_unix_secs") and not conversation.start_time:
        conversation.start_time = datetime.fromtimestamp(
            metadata["start_time_unix_secs"], tz=timezone.utc
        )

    if metadata.get("call_duration_secs"):
        conversation.duration_seconds = int(metadata["call_duration_secs"])
        if conversation.start_time:
            conversation.end_time = conversation.start_time + timedelta(
                seconds=conversation.duration_seconds
            )

    conversation.summary = analysis.get("transcript_summary") or conversation.summary
    conversation.completion_status = (
        analysis.get("call_successful") or data.get("status") or conversation.completion_status
    )

    conversation_metadata = conversation.conversation_metadata or {}
    if not conversation_metadata.get("elevenlabs_transcript_ingested"):
        _store_transcript_messages(db, conversation, transcript, metadata)
        conversation_metadata["elevenlabs_transcript_ingested"] = True

    conversation.conversation_metadata = conversation_metadata
    conversation.full_transcript = _format_full_transcript(transcript)

    extracted_questions = extract_questions_from_transcript(transcript)
    for item in extracted_questions:
        existing = db.query(Question).filter(
            Question.conversation_id == conversation.id,
            Question.question == item.question,
            Question.deleted_at == None,
        ).first()
        if existing:
            continue
        db.add(Question(
            new_hire_id=conversation.new_hire_id,
            conversation_id=conversation.id,
            question=item.question,
            context=item.context,
            category=item.category,
            priority=item.priority,
            status="pending",
        ))

    db.commit()
    return {"status": "processed"}


def _resolve_conversation(db: Session, data: dict) -> Conversation | None:
    elevenlabs_conversation_id = data.get("conversation_id")
    if elevenlabs_conversation_id:
        conversation = db.query(Conversation).filter(
            Conversation.elevenlabs_conversation_id == elevenlabs_conversation_id
        ).first()
        if conversation:
            return conversation

    dynamic_vars = (data.get("conversation_initiation_client_data") or {}).get(
        "dynamic_variables"
    ) or {}
    session_id = dynamic_vars.get("session_id") or data.get("user_id")
    if session_id:
        return db.query(Conversation).filter(Conversation.session_id == session_id).first()
    return None


def _store_transcript_messages(
    db: Session,
    conversation: Conversation,
    transcript: list[dict],
    metadata: dict,
) -> None:
    base_time = conversation.start_time
    if not base_time and metadata.get("start_time_unix_secs"):
        base_time = datetime.fromtimestamp(metadata["start_time_unix_secs"], tz=timezone.utc)

    existing_count = db.query(ConversationMessage).filter(
        ConversationMessage.conversation_id == conversation.id
    ).count()

    sequence_number = existing_count
    for turn in transcript:
        role = (turn.get("role") or "").lower()
        message = (turn.get("message") or "").strip()
        if not message:
            continue

        speaker = "agent" if role == "agent" else "new_hire"
        timestamp = None
        if base_time and turn.get("time_in_call_secs") is not None:
            timestamp = base_time + timedelta(seconds=float(turn["time_in_call_secs"]))

        sequence_number += 1
        db.add(ConversationMessage(
            conversation_id=conversation.id,
            speaker=speaker,
            message=message,
            timestamp=timestamp,
            sequence_number=sequence_number,
        ))


def _format_full_transcript(transcript: list[dict]) -> str | None:
    if not transcript:
        return None
    lines = []
    for turn in transcript:
        role = (turn.get("role") or "unknown").capitalize()
        message = (turn.get("message") or "").strip()
        if message:
            lines.append(f"{role}: {message}")
    return "\n".join(lines) if lines else None


def _as_dict(value: Any) -> dict:
    if value is None:
        return {}
    if isinstance(value, dict):
        return value
    if hasattr(value, "model_dump"):
        return value.model_dump()
    if hasattr(value, "dict"):
        return value.dict()
    try:
        return dict(value)
    except Exception:
        return {}
