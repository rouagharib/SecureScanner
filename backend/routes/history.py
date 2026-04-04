from fastapi import APIRouter, Depends
from fastapi import HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database import scans_collection
from services.token_service import verify_token
from bson import ObjectId

router = APIRouter(prefix="/api/history", tags=["History"])
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload

def format_scan(s: dict) -> dict:
    return {
        "id": str(s["_id"]),
        "type": s.get("type", ""),
        "target": s.get("target", ""),
        "status": s.get("status", ""),
        "total": s.get("results", {}).get("total", 0),
        "critical": s.get("results", {}).get("critical", 0),
        "high": s.get("results", {}).get("high", 0),
        "medium": s.get("results", {}).get("medium", 0),
        "low": s.get("results", {}).get("low", 0),
        "date": s["created_at"].strftime("%b %d, %Y") if s.get("created_at") else "",
    }

@router.get("/")
async def get_history(user=Depends(get_current_user)):
    # Only return scans belonging to the current user ✅
    cursor = scans_collection.find({"user_id": user["id"]}).sort("created_at", -1)
    scans = await cursor.to_list(length=100)
    return [format_scan(s) for s in scans]

@router.get("/stats")
async def get_stats(user=Depends(get_current_user)):
    # Only stats for the current user ✅
    cursor = scans_collection.find({"user_id": user["id"]})
    scans = await cursor.to_list(length=1000)
    total_scans = len(scans)
    total_vulns = sum(s.get("results", {}).get("total", 0) for s in scans)
    critical = sum(s.get("results", {}).get("critical", 0) for s in scans)
    high = sum(s.get("results", {}).get("high", 0) for s in scans)
    return {
        "total_scans": total_scans,
        "total_vulnerabilities": total_vulns,
        "critical": critical,
        "high": high,
    }

@router.get("/{scan_id}/full")
async def get_full_scan(scan_id: str, user=Depends(get_current_user)):
    scan = await scans_collection.find_one({
        "_id": ObjectId(scan_id),
        "user_id": user["id"]  # ensures users can only access their own scans ✅
    })
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return {
        "id": str(scan["_id"]),
        "type": scan.get("type", ""),
        "target": scan.get("target", ""),
        "status": scan.get("status", ""),
        "results": scan.get("results", {}),
        "date": scan["created_at"].strftime("%b %d, %Y") if scan.get("created_at") else "",
    }