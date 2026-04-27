import stripe
from datetime import datetime, timedelta
from config import STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
from database import subscriptions_collection, users_collection

stripe.api_key = STRIPE_SECRET_KEY


async def create_checkout_session(user_id: str, user_email: str, plan: str, success_url: str, cancel_url: str):
    """Create Stripe checkout session"""
    try:
        # Check if user already has a customer ID
        subscription = await subscriptions_collection.find_one({"user_id": user_id})
        
        session = stripe.checkout.Session.create(
            customer=subscription.get("stripe_customer_id") if subscription else None,
            customer_email=user_email if not subscription else None,
            payment_method_types=["card"],
            line_items=[{
                "price": PRICE_IDS[plan],
                "quantity": 1,
            }],
            mode="subscription",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"user_id": user_id, "plan": plan},
        )
        return {"session_id": session.id, "url": session.url}
    except Exception as e:
        print(f"Stripe error: {e}")
        return None

async def handle_webhook(payload, sig_header):
    """Handle Stripe webhook events"""
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        return False
    except stripe.error.SignatureVerificationError:
        return False

    # Handle subscription events
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        await create_subscription(
            user_id=session["metadata"]["user_id"],
            stripe_customer_id=session["customer"],
            stripe_subscription_id=session["subscription"],
            plan=session["metadata"]["plan"]
        )
    
    elif event["type"] == "invoice.payment_succeeded":
        # Update subscription period
        subscription_obj = event["data"]["object"]
        await update_subscription_period(subscription_obj["subscription"])
    
    elif event["type"] == "customer.subscription.deleted":
        # Cancel subscription
        subscription_obj = event["data"]["object"]
        await cancel_subscription(subscription_obj["id"])
    
    return True

async def create_subscription(user_id: str, stripe_customer_id: str, stripe_subscription_id: str, plan: str):
    """Create subscription record in DB"""
    now = datetime.utcnow()
    subscription = {
        "user_id": user_id,
        "stripe_customer_id": stripe_customer_id,
        "stripe_subscription_id": stripe_subscription_id,
        "plan": plan,
        "status": "active",
        "current_period_start": now,
        "current_period_end": now + timedelta(days=30),
        "cancel_at_period_end": False,
        "created_at": now,
        "updated_at": now
    }
    await subscriptions_collection.update_one(
        {"user_id": user_id},
        {"$set": subscription},
        upsert=True
    )
    
    # Update user role based on plan
    role = "pro_user" if plan == "pro" else "team_user"
    await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"subscription_plan": plan, "role": role}}
    )

async def get_user_subscription(user_id: str):
    """Get user's current subscription"""
    return await subscriptions_collection.find_one({"user_id": user_id})

async def check_scan_limit(user_id: str) -> bool:
    """Check if user has scans remaining this month"""
    subscription = await get_user_subscription(user_id)
    plan = subscription.get("plan", "free") if subscription else "free"
    
    limits = {"free": 5, "pro": 100, "team": 999999}
    limit = limits.get(plan, 5)
    
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