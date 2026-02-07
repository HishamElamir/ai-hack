from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal


class BenefitCreate(BaseModel):
    benefit_type: str
    description: str
    value: Optional[Decimal] = None
    currency: str = "USD"
    coverage_start_date: Optional[date] = None
    provider_name: Optional[str] = None


class BenefitResponse(BaseModel):
    id: str
    benefit_type: str
    description: str
    value: Optional[Decimal] = None
    currency: str = "USD"
    coverage_start_date: Optional[date] = None
    is_active: bool = True

    class Config:
        from_attributes = True


class NewHireCreate(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    preferred_language: str = "en"
    position: str
    department: str
    salary: Decimal
    currency: str = "USD"
    start_date: date
    employment_type: str = "full_time"
    country: str
    city: Optional[str] = None
    work_location: Optional[str] = None
    benefits: Optional[List[BenefitCreate]] = None
    notes: Optional[str] = None


class NewHireUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    preferred_language: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    salary: Optional[Decimal] = None
    currency: Optional[str] = None
    start_date: Optional[date] = None
    employment_type: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    work_location: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class NewHireListItem(BaseModel):
    id: str
    full_name: str
    email: str
    position: str
    department: str
    status: str
    start_date: date
    created_at: datetime
    progress_percentage: int = 0
    pending_questions: int = 0
    signed_contracts: int = 0
    total_contracts: int = 0

    class Config:
        from_attributes = True


class NewHireDetail(BaseModel):
    id: str
    email: str
    full_name: str
    phone: Optional[str] = None
    preferred_language: str = "en"
    position: str
    department: str
    salary: Decimal
    currency: str = "USD"
    start_date: date
    employment_type: str = "full_time"
    country: str
    city: Optional[str] = None
    work_location: Optional[str] = None
    status: str
    progress_percentage: int = 0
    voice_session_completed: bool = False
    offer_accepted: bool = False
    session_id: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    hr_employee: Optional[dict] = None
    benefits: List[BenefitResponse] = []
    contracts: list = []
    questions: list = []
    conversations: list = []

    class Config:
        from_attributes = True


class NewHireCreateResponse(BaseModel):
    id: str
    session_id: str
    invitation_link: str
    status: str
    created_at: datetime


class InvitationRequest(BaseModel):
    send_email: bool = True
    send_sms: bool = False
    custom_message: Optional[str] = None


class InvitationResponse(BaseModel):
    invitation_sent: bool
    invitation_link: str
    email_sent: bool
    sms_sent: bool
    expires_at: str


class DashboardStatistics(BaseModel):
    total_new_hires: int
    by_status: dict
    completion_rate: float
    average_time_to_complete_hours: float
    pending_questions: int
    this_month: dict


class PaginationMeta(BaseModel):
    total: int
    page: int
    per_page: int
    total_pages: int
    has_next: bool = False
    has_prev: bool = False


class NewHireListResponse(BaseModel):
    data: List[NewHireListItem]
    pagination: PaginationMeta


class AIParseNewHireRequest(BaseModel):
    description: str


class AIParseNewHireResponse(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    preferred_language: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    salary: Optional[float] = None
    currency: Optional[str] = None
    start_date: Optional[str] = None
    employment_type: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    work_location: Optional[str] = None
    benefits: Optional[List[dict]] = None
    notes: Optional[str] = None
