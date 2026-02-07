from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class GenerateContractRequest(BaseModel):
    new_hire_id: str
    contract_type: str
    template_id: Optional[str] = None
    generation_prompt: Optional[str] = None
    custom_variables: Optional[dict] = None
    # Optional fields to update new hire record
    update_new_hire: Optional[bool] = False
    new_hire_updates: Optional[dict] = None  # Can include salary, position, etc.


class ContractResponse(BaseModel):
    id: str
    contract_type: str
    status: str
    content: Optional[str] = None
    s3_url: Optional[str] = None
    version: int = 1
    generation_tokens: Optional[int] = None
    ai_model: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ContractUpdate(BaseModel):
    status: Optional[str] = None
    content: Optional[str] = None


class RegenerateContractRequest(BaseModel):
    generation_prompt: Optional[str] = None
    custom_variables: Optional[dict] = None


class ContractListItem(BaseModel):
    id: str
    contract_type: str
    status: str
    version: int
    new_hire_id: str
    new_hire_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
