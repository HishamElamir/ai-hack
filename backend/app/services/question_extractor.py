from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable


@dataclass
class ExtractedQuestion:
    question: str
    category: str
    priority: str
    context: str | None = None


ESCALATION_PHRASES = [
    "i'll note that for hr",
    "i will note that for hr",
    "hr will get back to you",
    "our hr team will get back to you",
    "i'll escalate that",
    "i will escalate that",
    "i'll pass that to hr",
    "i will pass that to hr",
    "i'll share that with hr",
    "i will share that with hr",
    "hr will follow up",
    "hr can follow up",
]

CATEGORY_KEYWORDS = {
    "benefits": ["insurance", "health", "leave", "vacation", "pto", "benefit"],
    "salary": ["salary", "bonus", "compensation", "pay", "raise"],
    "policies": ["remote", "hours", "flexible", "policy", "dress code"],
    "legal": ["contract", "probation", "notice", "termination", "gratuity"],
    "relocation": ["visa", "housing", "relocation", "move"],
    "team": ["team", "manager", "culture", "colleagues"],
    "growth": ["training", "promotion", "career", "development"],
}

PRIORITY_KEYWORDS = {
    "urgent": ["urgent", "asap", "immediately", "today"],
    "high": ["soon", "important", "critical"],
}

QUESTION_STARTS = (
    "can ",
    "could ",
    "what ",
    "how ",
    "when ",
    "where ",
    "why ",
    "do ",
    "does ",
    "is ",
    "are ",
    "will ",
    "would ",
    "should ",
)


def extract_questions_from_transcript(transcript: Iterable[dict]) -> list[ExtractedQuestion]:
    extracted: list[ExtractedQuestion] = []
    transcript_list = list(transcript)

    for idx, turn in enumerate(transcript_list):
        role = (turn.get("role") or "").lower()
        message = (turn.get("message") or "").strip()
        if role != "agent" or not message:
            continue

        message_lower = message.lower()
        if not any(phrase in message_lower for phrase in ESCALATION_PHRASES):
            continue

        user_question = _find_previous_user_question(transcript_list, idx)
        if not user_question:
            continue

        category = _categorize(user_question)
        priority = _assess_priority(user_question)
        extracted.append(
            ExtractedQuestion(
                question=user_question,
                category=category,
                priority=priority,
                context="Flagged by agent for HR follow-up",
            )
        )

    return _dedupe_questions(extracted)


def _find_previous_user_question(transcript_list: list[dict], idx: int) -> str | None:
    for back_idx in range(idx - 1, -1, -1):
        turn = transcript_list[back_idx]
        role = (turn.get("role") or "").lower()
        message = (turn.get("message") or "").strip()
        if role != "user" or not message:
            continue
        if _looks_like_question(message):
            return message
    return None


def _looks_like_question(message: str) -> bool:
    normalized = message.strip().lower()
    return normalized.endswith("?") or normalized.startswith(QUESTION_STARTS)


def _categorize(question: str) -> str:
    lowered = question.lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(keyword in lowered for keyword in keywords):
            return category
    return "general"


def _assess_priority(question: str) -> str:
    lowered = question.lower()
    for priority, keywords in PRIORITY_KEYWORDS.items():
        if any(keyword in lowered for keyword in keywords):
            return priority
    return "normal"


def _dedupe_questions(questions: list[ExtractedQuestion]) -> list[ExtractedQuestion]:
    seen = set()
    deduped: list[ExtractedQuestion] = []
    for item in questions:
        key = item.question.strip().lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)
    return deduped
