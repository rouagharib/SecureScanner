from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from middleware.auth import get_current_user
from services.payment_service import (
    create_checkout_session, 
    get_user_subscription, 
    get_user_scan_usage,
    save_subscription_from_session
)
from services.auth_service import get_user_by_id  # You'll need to create this
from config import APP_URL, PLAN_LIMITS

router = APIRouter(prefix="/api/payments", tags=["Payments"])

class CheckoutRequest(BaseModel):
    plan_key: str

class VerifyPaymentRequest(BaseModel):
    session_id: str
    plan_key: str

@router.post("/create-checkout")
async def create_checkout(request: CheckoutRequest, user=Depends(get_current_user)):
    """Create Stripe checkout session"""
    if request.plan_key not in PLAN_LIMITS:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    if request.plan_key == "free":
        raise HTTPException(status_code=400, detail="Free plan doesn't require payment")
    
    # Get the full user from database to get email
    from database import users_collection
    from bson import ObjectId
    
    full_user = await users_collection.find_one({"_id": ObjectId(user["id"])})
    if not full_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_email = full_user.get("email")
    if not user_email:
        raise HTTPException(status_code=400, detail="User email not found")
    
    success_url = f"{APP_URL}/payment/success?session_id={{CHECKOUT_SESSION_ID}}&plan_key={request.plan_key}"
    cancel_url = f"{APP_URL}/pricing"
    
    result = await create_checkout_session(
        user_id=user["id"],
        user_email=user_email,  # Now using email from database
        plan_key=request.plan_key,
        success_url=success_url,
        cancel_url=cancel_url
    )
    
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create checkout session")
    
    return result

@router.post("/verify-payment")
async def verify_payment(request: VerifyPaymentRequest, user=Depends(get_current_user)):
    """Verify payment after successful checkout and update subscription"""
    success = await save_subscription_from_session(
        session_id=request.session_id,
        user_id=user["id"],
        plan_key=request.plan_key
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to verify payment")
    
    return {"message": "Subscription activated successfully"}

@router.get("/subscription")
async def get_subscription(user=Depends(get_current_user)):
    """Get user's current subscription"""
    sub = await get_user_subscription(user["id"])
    if not sub:
        return {"plan_key": "free", "plan_name": "Free", "status": "active"}
    
    return {
        "plan_key": sub["plan_key"],
        "plan_name": PLAN_LIMITS.get(sub["plan_key"], {}).get("name", "Unknown"),
        "status": sub["status"],
        "current_period_end": sub["current_period_end"].isoformat() if sub.get("current_period_end") else None
    }

@router.get("/usage")
async def get_usage(user=Depends(get_current_user)):
    """Get user's scan usage statistics"""
    return await get_user_scan_usage(user["id"])