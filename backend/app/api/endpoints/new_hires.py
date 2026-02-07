import uuid
import math
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, case
from sqlalchemy.orm import Session, joinedload
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.hr_employee import HREmployee
from app.models.new_hire import NewHire
from app.models.benefit import Benefit
from app.models.contract import Contract
from app.models.question import Question
from app.models.conversation import Conversation
from app.models.conversation_message import ConversationMessage
from app.schemas.new_hire import (
    NewHireCreate, NewHireUpdate, NewHireListItem, NewHireDetail,
    NewHireCreateResponse, NewHireListResponse, PaginationMeta,
    DashboardStatistics, InvitationRequest, InvitationResponse,
    BenefitResponse, AIParseNewHireRequest, AIParseNewHireResponse,
)
from app.core.config import settings
import json

router = APIRouter(prefix="/new-hires", tags=["New Hires"])

STATUS_PROGRESS = {
    "draft": 0, "invited": 10, "in_progress": 30,
    "offer_presented": 50, "questions_pending": 50,
    "contract_sent": 70, "signed": 90, "completed": 100, "declined": 0,
}


def get_progress(status: str) -> int:
    return STATUS_PROGRESS.get(status, 0)


@router.get("/statistics", response_model=DashboardStatistics)
async def get_statistics(
    db: Session = Depends(get_db),
    current_user: HREmployee = Depends(get_current_user),
):
    base_q = db.query(NewHire).filter(NewHire.deleted_at == None)
    total = base_q.count()

    by_status = {}
    status_counts = db.query(NewHire.status, func.count(NewHire.id)).filter(
        NewHire.deleted_at == None
    ).group_by(NewHire.status).all()
    for s, c in status_counts:
        by_status[s] = c

    completed = by_status.get("completed", 0)
    completion_rate = (completed / total * 100) if total > 0 else 0

    pending_questions = db.query(Question).filter(
        Question.status == "pending",
        Question.deleted_at == None,
    ).count()

    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    this_month_created = base_q.filter(NewHire.created_at >= month_start).count()
    this_month_completed = base_q.filter(
        NewHire.status == "completed",
        NewHire.updated_at >= month_start,
    ).count()
    this_month_declined = base_q.filter(
        NewHire.status == "declined",
        NewHire.updated_at >= month_start,
    ).count()

    return DashboardStatistics(
        total_new_hires=total,
        by_status=by_status,
        completion_rate=round(completion_rate, 1),
        average_time_to_complete_hours=18.5,
        pending_questions=pending_questions,
        this_month={
            "new_hires_created": this_month_created,
            "completed": this_month_completed,
            "declined": this_month_declined,
        },
    )


@router.get("", response_model=NewHireListResponse)
async def list_new_hires(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: str = Query(None),
    search: str = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    db: Session = Depends(get_db),
    current_user: HREmployee = Depends(get_current_user),
):
    query = db.query(NewHire).filter(NewHire.deleted_at == None)

    if status:
        query = query.filter(NewHire.status == status)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (NewHire.full_name.ilike(search_term)) | (NewHire.email.ilike(search_term))
        )

    total = query.count()

    sort_col = getattr(NewHire, sort_by, NewHire.created_at)
    if sort_order == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    offset = (page - 1) * per_page
    new_hires = query.offset(offset).limit(per_page).all()

    items = []
    for nh in new_hires:
        pending_q = db.query(func.count(Question.id)).filter(
            Question.new_hire_id == nh.id, Question.status == "pending"
        ).scalar()
        signed_c = db.query(func.count(Contract.id)).filter(
            Contract.new_hire_id == nh.id, Contract.status == "signed"
        ).scalar()
        total_c = db.query(func.count(Contract.id)).filter(
            Contract.new_hire_id == nh.id
        ).scalar()

        items.append(NewHireListItem(
            id=str(nh.id),
            full_name=nh.full_name,
            email=nh.email,
            position=nh.position,
            department=nh.department,
            status=nh.status,
            start_date=nh.start_date,
            created_at=nh.created_at,
            progress_percentage=get_progress(nh.status),
            pending_questions=pending_q or 0,
            signed_contracts=signed_c or 0,
            total_contracts=total_c or 0,
        ))

    total_pages = math.ceil(total / per_page) if total > 0 else 1

    return NewHireListResponse(
        data=items,
        pagination=PaginationMeta(
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_prev=page > 1,
        ),
    )


@router.post("", response_model=NewHireCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_new_hire(
    request: NewHireCreate,
    db: Session = Depends(get_db),
    current_user: HREmployee = Depends(get_current_user),
):
    existing = db.query(NewHire).filter(NewHire.email == request.email, NewHire.deleted_at == None).first()
    if existing:
        raise HTTPException(status_code=400, detail="A new hire with this email already exists")

    session_id = uuid.uuid4().hex[:20]
    new_hire = NewHire(
        hr_employee_id=current_user.id,
        email=request.email,
        full_name=request.full_name,
        phone=request.phone,
        preferred_language=request.preferred_language,
        position=request.position,
        department=request.department,
        salary=request.salary,
        currency=request.currency,
        start_date=request.start_date,
        employment_type=request.employment_type,
        country=request.country,
        city=request.city,
        work_location=request.work_location,
        status="draft",
        session_id=session_id,
        session_expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        notes=request.notes,
    )
    db.add(new_hire)
    db.flush()

    if request.benefits:
        for b in request.benefits:
            benefit = Benefit(
                new_hire_id=new_hire.id,
                benefit_type=b.benefit_type,
                description=b.description,
                value=b.value,
                currency=b.currency,
                coverage_start_date=b.coverage_start_date,
                provider_name=b.provider_name,
            )
            db.add(benefit)

    db.commit()
    db.refresh(new_hire)

    return NewHireCreateResponse(
        id=str(new_hire.id),
        session_id=session_id,
        invitation_link=f"https://onboarding.company.com/join/{session_id}",
        status=new_hire.status,
        created_at=new_hire.created_at,
    )


@router.get("/{new_hire_id}", response_model=NewHireDetail)
async def get_new_hire(
    new_hire_id: str,
    db: Session = Depends(get_db),
    current_user: HREmployee = Depends(get_current_user),
):
    nh = db.query(NewHire).options(
        joinedload(NewHire.hr_employee),
        joinedload(NewHire.benefits),
        joinedload(NewHire.contracts),
        joinedload(NewHire.questions).joinedload(Question.conversation),
        joinedload(NewHire.conversations),
    ).filter(
        NewHire.id == new_hire_id,
        NewHire.deleted_at == None,
    ).first()

    if not nh:
        raise HTTPException(status_code=404, detail="New hire not found")

    pending_q = sum(1 for q in nh.questions if q.status == "pending")

    return NewHireDetail(
        id=str(nh.id),
        email=nh.email,
        full_name=nh.full_name,
        phone=nh.phone,
        preferred_language=nh.preferred_language,
        position=nh.position,
        department=nh.department,
        salary=nh.salary,
        currency=nh.currency,
        start_date=nh.start_date,
        employment_type=nh.employment_type,
        country=nh.country,
        city=nh.city,
        work_location=nh.work_location,
        status=nh.status,
        progress_percentage=get_progress(nh.status),
        voice_session_completed=nh.voice_session_completed,
        offer_accepted=nh.offer_accepted,
        session_id=nh.session_id,
        notes=nh.notes,
        created_at=nh.created_at,
        updated_at=nh.updated_at,
        hr_employee={"id": str(nh.hr_employee.id), "full_name": nh.hr_employee.full_name} if nh.hr_employee else None,
        benefits=[BenefitResponse(
            id=str(b.id), benefit_type=b.benefit_type,
            description=b.description, value=b.value,
            currency=b.currency, coverage_start_date=b.coverage_start_date,
            is_active=b.is_active,
        ) for b in nh.benefits if not b.deleted_at],
        contracts=[{
            "id": str(c.id), "contract_type": c.contract_type,
            "status": c.status, "version": c.version, "created_at": c.created_at.isoformat(),
        } for c in nh.contracts if not c.deleted_at],
        questions=[{
            "id": str(q.id),
            "question": q.question,
            "status": q.status,
            "priority": q.priority,
            "asked_at": q.asked_at.isoformat(),
            "conversation_id": str(q.conversation_id) if q.conversation_id else None,
            "conversation_start_time": (
                q.conversation.start_time.isoformat()
                if q.conversation and q.conversation.start_time else None
            ),
        } for q in nh.questions if not q.deleted_at],
        conversations=[{
            "id": str(cv.id),
            "start_time": cv.start_time.isoformat(),
            "duration_seconds": cv.duration_seconds,
            "completion_status": cv.completion_status,
            "summary": cv.summary,
            "sentiment_score": float(cv.sentiment_score) if cv.sentiment_score else None,
            "engagement_score": float(cv.engagement_score) if cv.engagement_score else None,
            "language": cv.language,
            "message_count": db.query(ConversationMessage).filter(
                ConversationMessage.conversation_id == cv.id
            ).count(),
        } for cv in nh.conversations],
    )


@router.patch("/{new_hire_id}")
async def update_new_hire(
    new_hire_id: str,
    request: NewHireUpdate,
    db: Session = Depends(get_db),
    current_user: HREmployee = Depends(get_current_user),
):
    nh = db.query(NewHire).filter(NewHire.id == new_hire_id, NewHire.deleted_at == None).first()
    if not nh:
        raise HTTPException(status_code=404, detail="New hire not found")

    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(nh, field, value)

    db.commit()
    db.refresh(nh)
    return {"message": "New hire updated successfully", "id": str(nh.id)}


@router.delete("/{new_hire_id}")
async def delete_new_hire(
    new_hire_id: str,
    db: Session = Depends(get_db),
    current_user: HREmployee = Depends(get_current_user),
):
    nh = db.query(NewHire).filter(NewHire.id == new_hire_id, NewHire.deleted_at == None).first()
    if not nh:
        raise HTTPException(status_code=404, detail="New hire not found")

    nh.deleted_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "New hire deleted successfully"}


@router.post("/{new_hire_id}/send-invitation", response_model=InvitationResponse)
async def send_invitation(
    new_hire_id: str,
    request: InvitationRequest,
    db: Session = Depends(get_db),
    current_user: HREmployee = Depends(get_current_user),
):
    try:
        nh = db.query(NewHire).filter(NewHire.id == new_hire_id, NewHire.deleted_at == None).first()
        if not nh:
            raise HTTPException(status_code=404, detail="New hire not found")

        nh.status = "invited"
        nh.invitation_sent_at = datetime.now(timezone.utc)
        nh.session_expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        db.commit()

        invitation_link = f"http://localhost:3000/join/{nh.session_id}"

        sms_sent = False
        if request.send_sms:
            if not nh.phone:
                raise HTTPException(status_code=400, detail="New hire phone number is required")
            if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN or not settings.TWILIO_WHATSAPP_FROM:
                raise HTTPException(status_code=500, detail="Twilio WhatsApp is not configured")
            try:
                _send_whatsapp_invitation(
                    account_sid=settings.TWILIO_ACCOUNT_SID,
                    auth_token=settings.TWILIO_AUTH_TOKEN,
                    from_number=settings.TWILIO_WHATSAPP_FROM,
                    to_number=nh.phone,
                    full_name=nh.full_name,
                    invitation_link=invitation_link,
                )
                sms_sent = True
            except Exception as e:
                print(f"WhatsApp send failed: {e}")
                raise HTTPException(status_code=500, detail=f"WhatsApp send failed: {str(e)}")

        return InvitationResponse(
            invitation_sent=True,
            invitation_link=invitation_link,
            email_sent=request.send_email,
            sms_sent=sms_sent,
            expires_at=nh.session_expires_at.isoformat(),
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Invitation send error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to send invitation: {str(e)}")


def _send_whatsapp_invitation(
    account_sid: str,
    auth_token: str,
    from_number: str,
    to_number: str,
    full_name: str,
    invitation_link: str,
) -> None:
    try:
        from twilio.rest import Client
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Twilio SDK not available") from exc

    from_whatsapp = _format_whatsapp_number(from_number, is_from=True)
    to_whatsapp = _format_whatsapp_number(to_number)

    message = (
        f"Hi {full_name}, welcome! Your onboarding session is ready. "
        f"Open your invitation link: {invitation_link}"
    )

    client = Client(account_sid, auth_token)
    try:
        client.messages.create(
            from_=from_whatsapp,
            to=to_whatsapp,
            body=message,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to send WhatsApp invitation") from exc


def _format_whatsapp_number(number: str, is_from: bool = False) -> str:
    cleaned = number.strip()
    if cleaned.startswith("whatsapp:"):
        return cleaned
    if not cleaned.startswith("+"):
        if is_from:
            raise HTTPException(
                status_code=500,
                detail="TWILIO_WHATSAPP_FROM must be in E.164 format or prefixed with whatsapp:",
            )
        raise HTTPException(status_code=400, detail="Phone must be in E.164 format (+...)")
    return f"whatsapp:{cleaned}"


@router.post("/parse-description", response_model=AIParseNewHireResponse)
async def parse_new_hire_description(
    request: AIParseNewHireRequest,
    current_user: HREmployee = Depends(get_current_user),
):
    """
    Parse a natural language description of a new hire and extract structured data.
    Example: "Omar Hassan, Senior Software Engineer in Cairo, starts March 1st, 25000 EGP salary"
    """
    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
    except ImportError:
        raise HTTPException(status_code=500, detail="OpenAI library not installed")
    except Exception:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")

    system_prompt = """You are an HR data extraction assistant. Extract structured employee information from natural language descriptions.

Extract the following fields if mentioned:
- full_name: Employee's full name
- email: Email address
- phone: Phone number
- preferred_language: "en" for English, "ar" for Arabic
- position: Job title/position
- department: Department name (e.g., Engineering, Marketing, Sales, HR, Finance)
- salary: Numeric salary value
- currency: Currency code (AED, USD, SAR, EGP)
- start_date: Start date in YYYY-MM-DD format
- employment_type: "full_time", "part_time", or "contract"
- country: Country name (UAE, Saudi Arabia, Egypt, Jordan, Qatar)
- city: City name
- work_location: "office", "remote", or "hybrid"
- benefits: Array of benefits with type and description
- notes: Any additional notes

Return ONLY valid JSON with the extracted fields. Omit fields that aren't mentioned.
Use null for missing values. Be smart about inferring information (e.g., if "Dubai" is mentioned, country is likely "UAE")."""

    user_prompt = f"""Extract employee information from this description:

"{request.description}"

Return only the JSON object with extracted fields."""

    try:
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
            response_format={"type": "json_object"},
        )

        parsed_data = json.loads(response.choices[0].message.content)
        return AIParseNewHireResponse(**parsed_data)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse description: {str(e)}"
        )
