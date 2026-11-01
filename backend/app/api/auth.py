from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user,
    get_current_admin,
)
from app.models.models import Officer, OfficerRole, AuditLog
from app.schemas.schemas import (
    Token,
    LoginRequest,
    OfficerResponse,
    OfficerCreate,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=Token)
async def login(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticate officer and retrieve JWT bearer access token.
    Accepts standard form-encoded OAuth2 credentials or JSON payload.
    """
    username = None
    password = None

    content_type = request.headers.get("content-type", "")
    if "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
        form = await request.form()
        username = form.get("username")
        password = form.get("password")
    else:
        try:
            body = await request.json()
            if isinstance(body, dict):
                username = body.get("username")
                password = body.get("password")
        except Exception:
            pass

    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username and password are required",
        )

    # Fetch officer from database
    result = await db.execute(select(Officer).where(Officer.username == username))
    officer = result.scalars().first()

    if not officer or not verify_password(password, officer.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not officer.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Contact district administration.",
        )

    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token_payload = {
        "sub": officer.username,
        "role": officer.role,
        "district": officer.district,
        "officer_id": officer.id,
    }
    access_token = create_access_token(
        data=token_payload,
        expires_delta=access_token_expires,
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=OfficerResponse.model_validate(officer),
    )


@router.get("/me", response_model=OfficerResponse)
async def get_me(
    current_user: Officer = Depends(get_current_user),
):
    """Retrieve profile and district assignment of currently authenticated officer."""
    return OfficerResponse.model_validate(current_user)


@router.post("/register", response_model=OfficerResponse, status_code=status.HTTP_201_CREATED)
async def register_officer(
    officer_in: OfficerCreate,
    db: AsyncSession = Depends(get_db),
    admin: Officer = Depends(get_current_admin),
):
    """
    Register a new disaster response officer or collector (Admin access required).
    """
    # Check if username exists
    existing_user = await db.execute(
        select(Officer).where(Officer.username == officer_in.username)
    )
    if existing_user.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered in system",
        )

    # Check if email exists
    existing_email = await db.execute(
        select(Officer).where(Officer.email == officer_in.email)
    )
    if existing_email.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address already registered",
        )

    new_officer = Officer(
        username=officer_in.username,
        full_name=officer_in.full_name,
        email=officer_in.email,
        hashed_password=get_password_hash(officer_in.password),
        district=officer_in.district,
        role=officer_in.role.upper(),
        is_active=officer_in.is_active,
    )
    db.add(new_officer)
    await db.flush()

    # Log audit event
    audit = AuditLog(
        action="OFFICER_REGISTERED",
        entity_type="Officer",
        entity_id=new_officer.id,
        officer_id=admin.id,
        officer_name=admin.full_name,
        details={
            "registered_username": new_officer.username,
            "district": new_officer.district,
            "role": new_officer.role,
        },
    )
    db.add(audit)
    await db.commit()
    await db.refresh(new_officer)

    return OfficerResponse.model_validate(new_officer)
