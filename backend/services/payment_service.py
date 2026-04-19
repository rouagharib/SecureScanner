import stripe
from datetime import datetime
from database import subscriptions_collection, users_collection, db
from config import STRIPE_SECRET_KEY, PLAN_LIMITS, APP_URL

stripe.api_key = STRIPE_SECRET_KEY

async def create_checkout_session(user_id: str, user_email: str, plan_key: str, success_url: str, cancel_url: str):
    """Create Stripe checkout session"""
    try:
        plan_config = PLAN_LIMITS.get(plan_key)
        if not plan_config or not plan_config.get("price_id"):
            print(f"Invalid plan_key: {plan_key}")
            return None
        
        # Get or create customer
        subscription = await get_user_subscription(user_id)
        customer_id = subscription.get("stripe_customer_id") if subscription else None
        
        session = stripe.checkout.Session.create(
            customer=customer_id if customer_id else None,
            customer_email=user_email if not customer_id else None,
            payment_method_types=["card"],
            line_items=[{
                "price": plan_config["price_id"],
                "quantity": 1,
            }],
            mode="subscription",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": user_id,
                "plan_key": plan_key
            }
        )
        return {"session_id": session.id, "url": session.url}
    except Exception as e:
        print(f"Stripe error: {e}")
        return None

async def save_subscription_from_session(session_id: str, user_id: str, plan_key: str):
    """Save subscription info after successful checkout"""
    try:
        # Retrieve the session from Stripe
        session = stripe.checkout.Session.retrieve(session_id)
        
        # Get subscription details
        subscription = stripe.Subscription.retrieve(session.subscription)
        
        subscription_data = {
            "user_id": user_id,
            "stripe_customer_id": session.customer,
            "stripe_subscription_id": session.subscription,
            "plan_key": plan_key,
            "status": subscription.status,
            "current_period_start": datetime.fromtimestamp(subscription.current_period_start),
            "current_period_end": datetime.fromtimestamp(subscription.current_period_end),
            "cancel_at_period_end": subscription.cancel_at_period_end,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await subscriptions_collection.update_one(
            {"user_id": user_id},
            {"$set": subscription_data},
            upsert=True
        )
        
        # Update user's role and plan
        role = "pro_user" if "pro" in plan_key else "enterprise_user"
        await users_collection.update_one(
            {"_id": user_id},
            {"$set": {
                "subscription_plan": plan_key,
                "role": role,
                "stripe_customer_id": session.customer,
                "updated_at": datetime.utcnow()
            }}
        )
        
        return True
    except Exception as e:
        print(f"Error saving subscription: {e}")
        return False

async def get_user_subscription(user_id: str):
    """Get user's current subscription from database"""
    return await subscriptions_collection.find_one({"user_id": user_id})

async def check_scan_limit(user_id: str) -> bool:
    """Check if user has scans remaining this month"""
    subscription = await get_user_subscription(user_id)
    plan_key = subscription.get("plan_key", "free") if subscription else "free"
    
    # Get plan limits
    plan_config = PLAN_LIMITS.get(plan_key, PLAN_LIMITS["free"])
    limit = plan_config["scans_per_month"]
    
    # Get or create monthly usage
    month_key = datetime.utcnow().strftime("%Y-%m")
    usage = await db.usage_collection.find_one({"user_id": user_id, "month": month_key})
    
    if not usage:
        usage = {
            "user_id": user_id,
            "month": month_key,
            "scans_used": 0,
            "scans_limit": limit,
            "reset_date": datetime.utcnow().replace(day=1)
        }
        await db.usage_collection.insert_one(usage)
    
    return usage["scans_used"] < limit

async def increment_scan_count(user_id: str):
    """Increment user's scan count for the month"""
    month_key = datetime.utcnow().strftime("%Y-%m")
    await db.usage_collection.update_one(
        {"user_id": user_id, "month": month_key},
        {"$inc": {"scans_used": 1}},
        upsert=True
    )

async def get_user_scan_usage(user_id: str):
    """Get current user's scan usage statistics"""
    subscription = await get_user_subscription(user_id)
    plan_key = subscription.get("plan_key", "free") if subscription else "free"
    
    plan_config = PLAN_LIMITS.get(plan_key, PLAN_LIMITS["free"])
    limit = plan_config["scans_per_month"]
    
    month_key = datetime.utcnow().strftime("%Y-%m")
    usage = await db.usage_collection.find_one({"user_id": user_id, "month": month_key})
    scans_used = usage.get("scans_used", 0) if usage else 0
    
    # Get reset date (first day of next month)
    now = datetime.utcnow()
    if now.month == 12:
        reset_date = datetime(now.year + 1, 1, 1)
    else:
        reset_date = datetime(now.year, now.month + 1, 1)
    
    # Get display name for plan
    plan_display = {
        "free": "Free",
        "pro_monthly": "Pro (Monthly)",
        "pro_yearly": "Pro (Yearly)",
        "enterprise_monthly": "Enterprise (Monthly)",
        "enterprise_yearly": "Enterprise (Yearly)"
    }.get(plan_key, "Free")
    
    return {
        "plan_key": plan_key,
        "plan_name": plan_display,
        "limit": limit,
        "used": scans_used,
        "remaining": max(0, limit - scans_used),
        "reset_date": reset_date.isoformat()
    }