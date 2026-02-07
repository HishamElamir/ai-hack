from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.hr_employee import HREmployee
from app.models.contract_template import ContractTemplate
from app.schemas.template import (
    TemplateCreate, TemplateUpdate, TemplateResponse, TemplateListItem,
)

router = APIRouter(prefix="/templates", tags=["Templates"])


@router.get("")
async def list_templates(
    template_type: str = Query(None),
    country: str = Query(None),
    language: str = Query(None),
    is_active: bool = Query(None),
    db: Session = Depends(get_db),
    current_user: HREmployee = Depends(get_current_user),
):
    query = db.query(ContractTemplate).filter(ContractTemplate.deleted_at == None)

    if template_type:
        query = query.filter(ContractTemplate.template_type == template_type)
    if country:
        query = query.filter(ContractTemplate.country == country)
    if language:
        query = query.filter(ContractTemplate.language == language)
    if is_active is not None:
        query = query.filter(ContractTemplate.is_active == is_active)

    templates = query.order_by(ContractTemplate.created_at.desc()).all()

    items = [TemplateListItem(
        id=str(t.id),
        name=t.name,
        template_type=t.template_type,
        country=t.country,
        language=t.language,
        version=t.version,
        is_active=t.is_active,
        created_at=t.created_at,
    ) for t in templates]

    return {"data": items}


@router.post("", status_code=201)
async def create_template(
    request: TemplateCreate,
    db: Session = Depends(get_db),
    current_user: HREmployee = Depends(get_current_user),
):
    template = ContractTemplate(
        name=request.name,
        description=request.description,
        template_type=request.template_type,
        country=request.country,
        language=request.language,
        content_template=request.content_template,
        variables=request.variables,
        tags=request.tags,
        requires_legal_review=request.requires_legal_review,
        created_by=current_user.id,
    )
    db.add(template)
    db.commit()
    db.refresh(template)

    return TemplateResponse(
        id=str(template.id),
        name=template.name,
        description=template.description,
        template_type=template.template_type,
        country=template.country,
        language=template.language,
        content_template=template.content_template,
        variables=template.variables,
        version=template.version,
        is_active=template.is_active,
        tags=template.tags,
        created_at=template.created_at,
        updated_at=template.updated_at,
    )


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: HREmployee = Depends(get_current_user),
):
    template = db.query(ContractTemplate).filter(
        ContractTemplate.id == template_id, ContractTemplate.deleted_at == None
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    return TemplateResponse(
        id=str(template.id),
        name=template.name,
        description=template.description,
        template_type=template.template_type,
        country=template.country,
        language=template.language,
        content_template=template.content_template,
        variables=template.variables,
        version=template.version,
        is_active=template.is_active,
        tags=template.tags,
        created_at=template.created_at,
        updated_at=template.updated_at,
    )


@router.patch("/{template_id}")
async def update_template(
    template_id: str,
    request: TemplateUpdate,
    db: Session = Depends(get_db),
    current_user: HREmployee = Depends(get_current_user),
):
    template = db.query(ContractTemplate).filter(
        ContractTemplate.id == template_id, ContractTemplate.deleted_at == None
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(template, field, value)

    db.commit()
    return {"message": "Template updated successfully"}
