from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import verify_password, create_access_token, create_refresh_token, decode_token
from app.core.config import settings
from app.core.deps import get_current_user
from app.models.hr_employee import HREmployee
from app.models.new_hire import NewHire
from app.schemas.auth import LoginRequest, TokenResponse, UserInfo, RefreshRequest, SessionValidation

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(HREmployee).filter(
        HREmployee.email == request.email,
        HREmployee.is_active == True,
        HREmployee.deleted_at == None,
    ).first()

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserInfo(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            department=user.department,
        ),
    )


@router.post("/refresh")
async def refresh_token(request: RefreshRequest, db: Session = Depends(get_db)):
    payload = decode_token(request.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user_id = payload.get("sub")
    user = db.query(HREmployee).filter(
        HREmployee.id == user_id,
        HREmployee.is_active == True,
    ).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


@router.post("/logout")
async def logout(current_user: HREmployee = Depends(get_current_user)):
    return {"message": "Successfully logged out"}


@router.get("/validate-session/{session_id}", response_model=SessionValidation)
async def validate_session(session_id: str, db: Session = Depends(get_db)):
    new_hire = db.query(NewHire).filter(
        NewHire.session_id == session_id,
        NewHire.deleted_at == None,
    ).first()

    if not new_hire:
        return SessionValidation(valid=False)

    if new_hire.session_expires_at and new_hire.session_expires_at < datetime.now(timezone.utc):
        return SessionValidation(valid=False)

    return SessionValidation(
        valid=True,
        new_hire={
            "id": str(new_hire.id),
            "full_name": new_hire.full_name,
            "preferred_language": new_hire.preferred_language,
            "status": new_hire.status,
        },
        expires_at=new_hire.session_expires_at.isoformat() if new_hire.session_expires_at else None,
    )


@router.get("/me")
async def get_me(current_user: HREmployee = Depends(get_current_user)):
    return UserInfo(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        department=current_user.department,
    )
