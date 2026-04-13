from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from middleware.auth import get_admin_user
from database import db
from bson import ObjectId

router = APIRouter(prefix="/api/admin", tags=["Admin"])


class UpdateUserRequest(BaseModel):
    role: Optional[str] = None
    status: Optional[str] = None


@router.get("/stats")
async def get_stats(admin=Depends(get_admin_user)):
    """Platform overview using MongoDB aggregation."""
    # Users count
    users_count = await db.users.count_documents({})
    scans_count = await db.scans.count_documents({})

    # Vuln stats via aggregation
    pipeline = [
        {"$group": {
            "_id": None,
            "total_vulnerabilities": {"$sum": "$results.total"},
            "critical": {"$sum": "$results.critical"},
            "high": {"$sum": "$results.high"}
        }}
    ]
    vuln_stats = await db.scans.aggregate(pipeline).to_list(1)
    total_vulns = vuln_stats[0].get("total_vulnerabilities", 0) if vuln_stats else 0

    # Top vulnerability types
    vuln_types = {}
    async for scan in db.scans.find({}, {"results.vulnerabilities.type": 1}):
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


@router.get("/users")
async def get_users(page: int = 1, limit: int = 20, admin=Depends(get_admin_user)):
    """List all users with scan count."""
    skip = (page - 1) * limit
    users = []
    cursor = db.users.find().skip(skip).limit(limit)
    async for user in cursor:
        scan_count = await db.scans.count_documents({"user_id": str(user["_id"])})
        users.append({
            "id": str(user["_id"]),
            "name": user.get("name", ""),
            "email": user.get("email", ""),
            "role": user.get("role", "user"),
            "status": user.get("status", "active"),
            "verified": user.get("verified", False),
            "scan_count": scan_count,
            "created_at": user["created_at"].strftime("%b %d, %Y") if user.get("created_at") else ""
        })
    total = await db.users.count_documents({})
    return {
        "data": users,
        "total": total,
        "page": page,
        "has_more": skip + len(users) < total
    }


@router.patch("/users/{user_id}")
async def update_user(user_id: str, body: UpdateUserRequest, admin=Depends(get_admin_user)):
    """Ban/unban a user or change their role."""
    update = {}
    if body.role in ["user", "admin"]:
        update["role"] = body.role
    if body.status in ["active", "banned"]:
        update["status"] = body.status
    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")

    update["updated_at"] = __import__("datetime").datetime.utcnow()
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update})
    return {"message": "User updated", **update}


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin=Depends(get_admin_user)):
    """Delete user and all their scans."""
    await db.users.delete_one({"_id": ObjectId(user_id)})
    await db.scans.delete_many({"user_id": user_id})
    return {"message": "User deleted"}


@router.get("/scans")
async def get_all_scans(page: int = 1, limit: int = 50, admin=Depends(get_admin_user)):
    """List scans across all users."""
    skip = (page - 1) * limit
    scans = []
    cursor = db.scans.find().sort("created_at", -1).skip(skip).limit(limit)
    async for scan in cursor:
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
    total = await db.scans.count_documents({})
    return {
        "data": scans,
        "total": total,
        "page": page,
        "has_more": skip + len(scans) < total
    }
