# models/subscription.py
# Subscription document structure:
# {
#   "_id": ObjectId,
#   "user_id": str,
#   "stripe_customer_id": str,
#   "stripe_subscription_id": str,
#   "plan": "free" | "pro" | "team",
#   "status": "active" | "canceled" | "past_due",
#   "current_period_start": datetime,
#   "current_period_end": datetime,
#   "cancel_at_period_end": bool,
#   "created_at": datetime,
#   "updated_at": datetime
# }

# Usage tracking document:
# {
#   "_id": ObjectId,
#   "user_id": str,
#   "month": str (YYYY-MM),
#   "scans_used": int,
#   "scans_limit": int,
#   "reset_date": datetime
# }