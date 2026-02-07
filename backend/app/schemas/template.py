from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class TemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    template_type: str
    country: str
    language: str = "en"
    content_template: str
    variables: list = []
    tags: Optional[list[str]] = None
    requires_legal_review: bool = True


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    content_template: Optional[str] = None
    variables: Optional[list] = None
    is_active: Optional[bool] = None
    tags: Optional[list[str]] = None


class TemplateResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    template_type: str
    country: str
    language: str
    content_template: Optional[str] = None
    variables: list = []
    version: int = 1
    is_active: bool = True
    tags: Optional[list[str]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TemplateListItem(BaseModel):
    id: str
    name: str
    template_type: str
    country: str
    language: str
    version: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
