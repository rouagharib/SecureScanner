from fastapi import APIRouter
from controllers.auth_controller import (
    register, login, forgot_password, reset_password,
    RegisterRequest, LoginRequest, ForgotPasswordRequest, ResetPasswordRequest
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register")
async def register_route(request: RegisterRequest):
    return await register(request)

@router.post("/login")
async def login_route(request: LoginRequest):
    return await login(request)

@router.post("/forgot-password")
async def forgot_password_route(request: ForgotPasswordRequest):
    return await forgot_password(request)

@router.post("/reset-password")
async def reset_password_route(request: ResetPasswordRequest):
    return await reset_password(request)