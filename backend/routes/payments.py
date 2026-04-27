from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from middleware.auth import get_current_user
from services.payment_service import create_checkout_session, get_user_subscription
from config import APP_URL

router = APIRouter(prefix="/api/payments", tags=["Payments"])

class CheckoutRequest(BaseModel):
    plan: str  # "pro" or "team"

@router.post("/create-checkout")
async def create_checkout(request: CheckoutRequest, user=Depends(get_current_user)):
    """Create Stripe checkout session"""
    if request.plan not in ["pro", "team"]:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    success_url = f"{APP_URL}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{APP_URL}/pricing"
    
    result = await create_checkout_session(
        user_id=user["id"],
        user_email=user["email"],
        plan=request.plan,
        success_url=success_url,
        cancel_url=cancel_url
    )
    
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create checkout session")
    
    return result

@router.get("/subscription")
async def get_subscription(user=Depends(get_current_user)):
    """Get user's current subscription"""
    sub = await get_user_subscription(user["id"])
    if not sub:
        return {"plan": "free", "status": "active"}
    
    return {
        "plan": sub["plan"],
        "status": sub["status"],
        "current_period_end": sub["current_period_end"].isoformat(),
        "cancel_at_period_end": sub["cancel_at_period_end"]
    }

@router.post("/cancel-subscription")
async def cancel_subscription_endpoint(user=Depends(get_current_user)):
    """Cancel subscription at period end"""
    # Call Stripe API to cancel
    # Update DB to set cancel_at_period_end = True
    return {"message": "Subscription will cancel at end of period"}