from pydantic import BaseModel, EmailStr
from typing import Optional


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserInfo"


class UserInfo(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    department: Optional[str] = None

    class Config:
        from_attributes = True


class RefreshRequest(BaseModel):
    refresh_token: str


class SessionValidation(BaseModel):
    valid: bool
    new_hire: Optional[dict] = None
    expires_at: Optional[str] = None
