from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from database import db
from services.token_service import verify_token
from bson import ObjectId

router = APIRouter(prefix="/api/admin", tags=["Admin"])
security = HTTPBearer()

# ── ADMIN GUARD ───────────────────────────────────────────
def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Middleware — only allows users with role = admin"""
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return payload

# ── STATS ─────────────────────────────────────────────────
@router.get("/stats")
async def get_stats(admin=Depends(get_admin_user)):
    """Platform overview — total users, scans, vulnerabilities"""
    users_count = await db.users.count_documents({})
    scans_count = await db.scans.count_documents({})

    total_vulns = 0
    async for scan in db.scans.find():
        total_vulns += scan.get("results", {}).get("total", 0)

    vuln_types = {}
    async for scan in db.scans.find():
        for v in scan.get("results", {}).get("vulnerabilities", []):
            t = v.get("type", "Unknown")
            vuln_types[t] = vuln_types.get(t, 0) + 1

    top_vulns = sorted(vuln_types.items(), key=lambda x: x[1], reverse=True)[:5]

    return {
        "total_users": users_count,
        "total_scans": scans_count,
        "total_vulnerabilities": total_vulns,
        "top_vulnerability_types": [{"type": t, "count": c} for t, c in top_vulns]
    }

# ── USERS ─────────────────────────────────────────────────
@router.get("/users")
async def get_users(admin=Depends(get_admin_user)):
    """List all users with scan count"""
    users = []
    async for user in db.users.find():
        scan_count = await db.scans.count_documents({"user_id": str(user["_id"])})
        users.append({
            "id": str(user["_id"]),
            "name": user.get("name", ""),
            "email": user.get("email", ""),
            "role": user.get("role", "user"),
            "status": user.get("status", "active"),
            "scan_count": scan_count,
            "created_at": user["created_at"].strftime("%b %d, %Y") if user.get("created_at") else ""
        })
    return users

class UpdateUserRequest(BaseModel):
    role: Optional[str] = None
    status: Optional[str] = None

@router.patch("/users/{user_id}")
async def update_user(user_id: str, body: UpdateUserRequest, admin=Depends(get_admin_user)):
    """Ban/unban a user or change their role"""
    update = {}
    if body.role in ["user", "admin"]:
        update["role"] = body.role
    if body.status in ["active", "banned"]:
        update["status"] = body.status
    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update})
    return {"message": "User updated", **update}

@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin=Depends(get_admin_user)):
    """Delete user and all their scans"""
    await db.users.delete_one({"_id": ObjectId(user_id)})
    await db.scans.delete_many({"user_id": user_id})
    return {"message": "User deleted"}

# ── SCANS ─────────────────────────────────────────────────
@router.get("/scans")
async def get_all_scans(admin=Depends(get_admin_user)):
    """List last 50 scans across all users"""
    scans = []
    async for scan in db.scans.find().sort("created_at", -1).limit(50):
        scans.append({
            "id": str(scan["_id"]),
            "user_id": scan.get("user_id", ""),
            "type": scan.get("type", ""),
            "target": scan.get("target", ""),
            "status": scan.get("status", ""),
            "total": scan.get("results", {}).get("total", 0),
            "critical": scan.get("results", {}).get("critical", 0),
            "high": scan.get("results", {}).get("high", 0),
            "date": scan["created_at"].strftime("%b %d, %Y") if scan.get("created_at") else ""
        })
    return scans