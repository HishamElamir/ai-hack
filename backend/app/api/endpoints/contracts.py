from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.hr_employee import HREmployee
from app.models.new_hire import NewHire
from app.models.contract import Contract
from app.models.contract_template import ContractTemplate
from app.schemas.contract import (
    GenerateContractRequest, ContractResponse, ContractUpdate,
    RegenerateContractRequest, ContractListItem,
)
from app.services.document_generator import DocumentGeneratorService
import io

router = APIRouter(prefix="/contracts", tags=["Contracts"])


@router.get("")
async def list_contracts(
    new_hire_id: str = Query(None),
    status_filter: str = Query(None, alias="status"),
    contract_type: str = Query(None),
    db: Session = Depends(get_db),
    current_user: HREmployee = Depends(get_current_user),
):
    query = db.query(Contract).filter(Contract.deleted_at == None)

    if new_hire_id:
        query = query.filter(Contract.new_hire_id == new_hire_id)
    if status_filter:
        query = query.filter(Contract.status == status_filter)
    if contract_type:
        query = query.filter(Contract.contract_type == contract_type)

    contracts = query.order_by(Contract.created_at.desc()).all()

    items = []
    for c in contracts:
        nh = db.query(NewHire).filter(NewHire.id == c.new_hire_id).first()
        items.append(ContractListItem(
            id=str(c.id),
            contract_type=c.contract_type,
            status=c.status,
            version=c.version,
            new_hire_id=str(c.new_hire_id),
            new_hire_name=nh.full_name if nh else None,
            created_at=c.created_at,
        ))

    return {"data": items}


@router.post("/generate", response_model=ContractResponse, status_code=status.HTTP_201_CREATED)
async def generate_contract(
    request: GenerateContractRequest,
    db: Session = Depends(get_db),
    current_user: HREmployee = Depends(get_current_user),
):
    new_hire = db.query(NewHire).filter(
        NewHire.id == request.new_hire_id, NewHire.deleted_at == None
    ).first()
    if not new_hire:
        raise HTTPException(status_code=404, detail="New hire not found")

    # Update new hire information if requested
    if request.update_new_hire and request.new_hire_updates:
        allowed_fields = {'salary', 'position', 'department', 'start_date', 
                         'employment_type', 'work_location', 'currency'}
        for field, value in request.new_hire_updates.items():
            if field in allowed_fields and value is not None:
                setattr(new_hire, field, value)
        new_hire.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(new_hire)

    template = None
    if request.template_id:
        template = db.query(ContractTemplate).filter(
            ContractTemplate.id == request.template_id
        ).first()

    generator = DocumentGeneratorService()
    contract = await generator.generate_contract(
        db=db,
        new_hire=new_hire,
        contract_type=request.contract_type,
        template=template,
        generation_prompt=request.generation_prompt,
        custom_variables=request.custom_variables,
    )

    return ContractResponse(
        id=str(contract.id),
        contract_type=contract.contract_type,
        status=contract.status,
        content=contract.content,
        s3_url=contract.s3_url,
        version=contract.version,
        generation_tokens=contract.generation_tokens,
        ai_model=contract.ai_model,
        created_at=contract.created_at,
        updated_at=contract.updated_at,
    )


@router.get("/{contract_id}", response_model=ContractResponse)
async def get_contract(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: HREmployee = Depends(get_current_user),
):
    contract = db.query(Contract).filter(
        Contract.id == contract_id, Contract.deleted_at == None
    ).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    return ContractResponse(
        id=str(contract.id),
        contract_type=contract.contract_type,
        status=contract.status,
        content=contract.content,
        s3_url=contract.s3_url,
        version=contract.version,
        generation_tokens=contract.generation_tokens,
        ai_model=contract.ai_model,
        created_at=contract.created_at,
        updated_at=contract.updated_at,
    )


@router.patch("/{contract_id}")
async def update_contract(
    contract_id: str,
    request: ContractUpdate,
    db: Session = Depends(get_db),
    current_user: HREmployee = Depends(get_current_user),
):
    contract = db.query(Contract).filter(
        Contract.id == contract_id, Contract.deleted_at == None
    ).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(contract, field, value)

    db.commit()
    db.refresh(contract)
    return {"message": "Contract updated successfully"}


@router.get("/{contract_id}/download")
async def download_contract(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: HREmployee = Depends(get_current_user),
):
    contract = db.query(Contract).filter(
        Contract.id == contract_id, Contract.deleted_at == None
    ).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    # For now, generate a simple text file from the contract content
    content = contract.content or "No content available"
    buffer = io.BytesIO(content.encode("utf-8"))

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=contract_{contract_id}.pdf"},
    )


@router.post("/{contract_id}/regenerate", response_model=ContractResponse)
async def regenerate_contract(
    contract_id: str,
    request: RegenerateContractRequest,
    db: Session = Depends(get_db),
    current_user: HREmployee = Depends(get_current_user),
):
    old_contract = db.query(Contract).filter(
        Contract.id == contract_id, Contract.deleted_at == None
    ).first()
    if not old_contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    new_hire = db.query(NewHire).filter(NewHire.id == old_contract.new_hire_id).first()
    template = db.query(ContractTemplate).filter(
        ContractTemplate.id == old_contract.template_id
    ).first() if old_contract.template_id else None

    generator = DocumentGeneratorService()
    contract = await generator.generate_contract(
        db=db,
        new_hire=new_hire,
        contract_type=old_contract.contract_type,
        template=template,
        generation_prompt=request.generation_prompt,
        custom_variables=request.custom_variables,
        parent_contract_id=old_contract.id,
        version=old_contract.version + 1,
    )

    return ContractResponse(
        id=str(contract.id),
        contract_type=contract.contract_type,
        status=contract.status,
        content=contract.content,
        s3_url=contract.s3_url,
        version=contract.version,
        generation_tokens=contract.generation_tokens,
        ai_model=contract.ai_model,
        created_at=contract.created_at,
        updated_at=contract.updated_at,
    )
