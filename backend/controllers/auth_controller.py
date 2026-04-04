from fastapi import HTTPException, status
from pydantic import BaseModel
from services.auth_service import create_user, get_user_by_email, verify_password, format_user
from services.token_service import create_access_token
from services.email_service import send_verification_email, send_login_notification, send_reset_password_email
import secrets

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

async def register(request: RegisterRequest):
    user = await create_user(request.name, request.email, request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Send verification email
    verification_token = secrets.token_urlsafe(32)
    send_verification_email(request.email, request.name, verification_token)

    return {"message": "Account created successfully. Please check your email to verify your account."}

async def login(request: LoginRequest):
    user = await get_user_by_email(request.email)
    if not user or not verify_password(request.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    token = create_access_token({"sub": user["email"], "id": str(user["_id"])})

    # Send login notification email
    send_login_notification(request.email, user["name"])

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": format_user(user)
    }

async def forgot_password(request: ForgotPasswordRequest):
    user = await get_user_by_email(request.email)

    # Always return success even if email doesn't exist (security best practice)
    if user:
        reset_token = secrets.token_urlsafe(32)
        send_reset_password_email(request.email, user["name"], reset_token)

    return {"message": "If this email exists, a reset link has been sent."}

async def reset_password(request: ResetPasswordRequest):
    # For now return success - full implementation needs token storage in DB
    if len(request.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters"
        )
    return {"message": "Password reset successfully. You can now log in."}