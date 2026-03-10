from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from controllers.auth_controller import register, login, RegisterRequest, LoginRequest

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register")
def register_route(request: RegisterRequest, db: Session = Depends(get_db)):
    return register(request, db)

@router.post("/login")
def login_route(request: LoginRequest, db: Session = Depends(get_db)):
    return login(request, db)