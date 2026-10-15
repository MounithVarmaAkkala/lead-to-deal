from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.assignment_engine import get_rep_open_lead_count, fill_capacity_from_hot_queue
from app.auth import (
    get_current_user, get_password_hash, issue_tokens, require_admin,
    user_from_token, verify_password,
)
from app.database import get_db
from app.models import Tenant, User
from app.schemas import RefreshRequest, Token, UserCreate, UserInvite, UserLogin, UserResponse
from app.scoring_engine import ensure_default_weights

router = APIRouter(prefix="/auth", tags=["auth"])


def user_dict(db: Session, user: User) -> dict:
    return {
        "id": user.id,
        "tenant_id": user.tenant_id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "max_concurrent_leads": user.max_concurrent_leads,
        "is_available": user.is_available,
        "current_leads_count": get_rep_open_lead_count(db, user.id),
        "created_at": user.created_at,
    }


@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return {**issue_tokens(user), "user": user_dict(db, user)}


@router.post("/refresh", response_model=Token)
def refresh(req: RefreshRequest, db: Session = Depends(get_db)):
    user = user_from_token(db, req.refresh_token, expected_type="refresh")
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    return {**issue_tokens(user), "user": user_dict(db, user)}


@router.post("/register", response_model=Token, status_code=201)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Self-serve signup creates a brand-new tenant whose first user is its admin.
    Joining an existing tenant is only possible through an admin invite."""
    if db.query(Tenant).filter(Tenant.name == user_data.tenant_name).first():
        raise HTTPException(status_code=409, detail="Workspace name already taken")
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    tenant = Tenant(name=user_data.tenant_name)
    db.add(tenant)
    db.flush()
    user = User(
        tenant_id=tenant.id,
        email=user_data.email,
        name=user_data.name,
        hashed_password=get_password_hash(user_data.password),
        role="admin",
        max_concurrent_leads=user_data.max_concurrent_leads,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    ensure_default_weights(db, tenant.id)
    return {**issue_tokens(user), "user": user_dict(db, user)}


@router.post("/invite", response_model=UserResponse, status_code=201)
def invite_user(
    data: UserInvite,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(
        tenant_id=current_user.tenant_id,
        email=data.email,
        name=data.name,
        hashed_password=get_password_hash(data.password),
        role=data.role,
        max_concurrent_leads=data.max_concurrent_leads,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    # A new rep is fresh capacity: drain the hot queue into it.
    fill_capacity_from_hot_queue(db, current_user.tenant_id)
    return user_dict(db, user)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return user_dict(db, current_user)


@router.get("/reps", response_model=List[UserResponse])
def get_reps(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    reps = db.query(User).filter(User.tenant_id == current_user.tenant_id).order_by(User.created_at).all()
    return [user_dict(db, r) for r in reps]
