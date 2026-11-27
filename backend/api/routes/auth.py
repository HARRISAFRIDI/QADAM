from fastapi import APIRouter, Request, Response

from api.dependencies import DB, CurrentUser
from core.rate_limit import client_ip, enforce
from schemas.auth import (
    AuthOut,
    ChangePasswordIn,
    LoginIn,
    MeOut,
    ProfileUpdateIn,
    RegisterIn,
)
from schemas.common import OkResponse
from services import auth_service

router = APIRouter(tags=["auth"])


@router.post("/auth/register", response_model=AuthOut, status_code=201)
async def register(data: RegisterIn, request: Request, response: Response, db: DB):
    await enforce(db, f"register:{client_ip(request)}", limit=10, window_sec=3600)
    user = await auth_service.register(db, data)
    auth_service.set_session_cookie(response, user)
    return {"user": await auth_service.me_payload(db, user)}


@router.post("/auth/login", response_model=AuthOut)
async def login(data: LoginIn, request: Request, response: Response, db: DB):
    await enforce(db, f"login:ip:{client_ip(request)}", limit=40, window_sec=900)
    await enforce(db, f"login:email:{data.email.lower()}", limit=10, window_sec=900)
    user = await auth_service.authenticate(db, data)
    auth_service.set_session_cookie(response, user)
    return {"user": await auth_service.me_payload(db, user)}


@router.post("/auth/logout", response_model=OkResponse)
async def logout(response: Response):
    auth_service.clear_session_cookie(response)
    return OkResponse()


@router.get("/me", response_model=MeOut)
async def me(user: CurrentUser, db: DB, response: Response):
    response.headers["Cache-Control"] = "private, no-store"
    return await auth_service.me_payload(db, user)


@router.patch("/me", response_model=MeOut)
async def update_me(data: ProfileUpdateIn, user: CurrentUser, db: DB):
    user = await auth_service.update_profile(db, user, data)
    return await auth_service.me_payload(db, user)


@router.post("/me/password", response_model=OkResponse)
async def change_password(data: ChangePasswordIn, user: CurrentUser, db: DB, response: Response):
    user = await auth_service.change_password(db, user, data)
    auth_service.set_session_cookie(response, user)  # keep this device signed in
    return OkResponse()
