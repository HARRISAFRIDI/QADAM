from datetime import UTC, datetime

from fastapi import Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import get_settings
from core.errors import AppError, bad_request, conflict
from core.security import (
    create_access_token,
    dummy_verify,
    hash_password,
    verify_password,
)
from models import User
from schemas.auth import ChangePasswordIn, LoginIn, ProfileUpdateIn, RegisterIn
from services.taxonomy import get_taxonomy


def set_session_cookie(response: Response, user: User) -> None:
    s = get_settings()
    token = create_access_token(user.id, user.role, user.token_version)
    response.set_cookie(
        s.cookie_name,
        token,
        max_age=s.access_token_ttl_minutes * 60,
        httponly=True,
        secure=s.secure_cookies,
        samesite="lax",
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    s = get_settings()
    response.delete_cookie(s.cookie_name, path="/", secure=s.secure_cookies, samesite="lax")


async def me_payload(db: AsyncSession, user: User) -> dict:
    preferred = target_exam = None
    if user.preferred_category_id or user.target_exam_id:
        t = await get_taxonomy(db)
        cat = t.categories.get(user.preferred_category_id) if user.preferred_category_id else None
        preferred = cat["code"] if cat else None
        exam_id = cat["exam_id"] if cat else user.target_exam_id
        exam = t.exams.get(exam_id) if exam_id else None
        target_exam = exam["code"] if exam else None
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "phone": user.phone,
        "city": user.city,
        "role": user.role,
        "preferred_category": preferred,
        "target_exam": target_exam,
        "daily_goal": user.daily_goal,
        "created_at": user.created_at,
    }


async def register(db: AsyncSession, data: RegisterIn) -> User:
    email = data.email.lower()
    exists = await db.scalar(select(User.id).where(User.email == email))
    if exists:
        raise conflict("An account with this email already exists", "email_taken")
    target_exam_id = None
    if data.target_exam:
        t = await get_taxonomy(db)
        exam = t.exam_by_code.get(data.target_exam)
        target_exam_id = exam["id"] if exam else None
    user = User(
        email=email,
        password_hash=await hash_password(data.password),
        full_name=data.full_name,
        phone=(data.phone or "").strip() or None,
        city=(data.city or "").strip() or None,
        target_exam_id=target_exam_id,
        last_login_at=datetime.now(UTC),
    )
    db.add(user)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise conflict("An account with this email already exists", "email_taken") from exc
    await db.refresh(user)
    return user


async def authenticate(db: AsyncSession, data: LoginIn) -> User:
    user = (
        await db.execute(select(User).where(User.email == data.email.lower()))
    ).scalar_one_or_none()
    if user is None:
        await dummy_verify(data.password)
        raise AppError(401, "invalid_credentials", "Incorrect email or password")
    if not await verify_password(data.password, user.password_hash):
        raise AppError(401, "invalid_credentials", "Incorrect email or password")
    if not user.is_active:
        raise AppError(403, "account_disabled", "This account has been disabled")
    user.last_login_at = datetime.now(UTC)
    await db.commit()
    return user


async def update_profile(db: AsyncSession, user: User, data: ProfileUpdateIn) -> User:
    if data.full_name is not None:
        user.full_name = " ".join(data.full_name.split())
    if data.phone is not None:
        user.phone = data.phone.strip() or None
    if data.city is not None:
        user.city = data.city.strip() or None
    if data.preferred_category is not None:
        t = await get_taxonomy(db)
        cat = t.category(data.preferred_category)
        user.preferred_category_id = cat["id"]
        user.target_exam_id = cat["exam_id"]
    if data.daily_goal is not None:
        user.daily_goal = data.daily_goal
    await db.commit()
    return user


async def change_password(db: AsyncSession, user: User, data: ChangePasswordIn) -> User:
    if not await verify_password(data.current_password, user.password_hash):
        raise bad_request("Current password is incorrect", "invalid_password")
    user.password_hash = await hash_password(data.new_password)
    user.token_version += 1  # signs out other devices
    await db.commit()
    return user
