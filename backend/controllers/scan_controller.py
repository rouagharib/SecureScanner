import os
import asyncio
import tempfile
import shutil
from datetime import datetime
from pathlib import Path
from fastapi import UploadFile, HTTPException
from pydantic import BaseModel
from database import scans_collection, db
from services.sast_service import run_scan, extract_zip
from services.dast_service import run_dast_scan
from services.ai_service import analyze_vulnerabilities
from services.git_service import clone_and_scan
from services.payment_service import check_scan_limit, increment_scan_count, get_user_subscription
from config import ALLOWED_EXTENSIONS
import logging

logger = logging.getLogger(__name__)


async def save_scan(user_id: str, type: str, target: str, results: dict):
    """Save scan results to database"""
    scan = {
        "user_id": user_id,
        "type": type,
        "target": target,
        "status": "completed",
        "results": results,
        "created_at": datetime.utcnow()
    }
    result = await scans_collection.insert_one(scan)
    return str(result.inserted_id)


def _run_sast_sync(file_paths: list, temp_dir: str) -> dict:
    """Run SAST synchronously in a thread pool."""
    all_vulnerabilities = []
    all_languages = set()

    for file_path in file_paths:
        ext = os.path.splitext(file_path)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            continue

        if ext == ".zip":
            extract_to = os.path.join(temp_dir, "extracted")
            os.makedirs(extract_to, exist_ok=True)
            extract_zip(file_path, extract_to)
            scan_result = run_scan(extract_to)
        else:
            scan_result = run_scan(file_path)

        all_vulnerabilities.extend(scan_result["vulnerabilities"])
        all_languages.update(scan_result["languages"])

    return {"vulnerabilities": all_vulnerabilities, "languages": list(all_languages)}


async def sast_scan(files: list[UploadFile], user_id: str):
    """SAST scan with usage limit checking"""
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    # Check if user has scans remaining this month
    if not await check_scan_limit(user_id):
        subscription = await get_user_subscription(user_id)
        plan = subscription.get("plan", "free") if subscription else "free"
        
        limits = {"free": 5, "pro": 100, "team": 999999}
        limit = limits.get(plan, 5)
        
        raise HTTPException(
            status_code=403, 
            detail=f"Monthly scan limit reached ({limit}/{limit} scans). Upgrade to Pro for more scans."
        )

    temp_dir = tempfile.mkdtemp()
    uploaded_paths = []

    try:
        for file in files:
            # Sanitize filename to prevent path traversal
            safe_name = Path(file.filename).name
            ext = os.path.splitext(safe_name)[1].lower()

            if ext not in ALLOWED_EXTENSIONS:
                logger.warning(f"Skipped file with unsupported extension: {safe_name}")
                continue

            file_path = os.path.join(temp_dir, safe_name)
            with open(file_path, "wb") as f:
                content = await file.read()
                f.write(content)
            uploaded_paths.append(file_path)

        # Run blocking SAST scan in thread pool
        scan_result = await asyncio.to_thread(_run_sast_sync, uploaded_paths, temp_dir)

        # Run AI analysis in thread pool (blocking)
        all_vulnerabilities = await asyncio.to_thread(
            analyze_vulnerabilities, scan_result["vulnerabilities"]
        )

        result = {
            "type": "SAST",
            "target": f"{len(uploaded_paths)} files",
            "filename": f"{len(uploaded_paths)} files",
            "languages": scan_result["languages"],
            "total": len(all_vulnerabilities),
            "critical": len([v for v in all_vulnerabilities if v.get("severity") == "critical"]),
            "high": len([v for v in all_vulnerabilities if v.get("severity") == "high"]),
            "medium": len([v for v in all_vulnerabilities if v.get("severity") == "medium"]),
            "low": len([v for v in all_vulnerabilities if v.get("severity") == "low"]),
            "vulnerabilities": all_vulnerabilities
        }

        # Increment scan count after successful scan
        await increment_scan_count(user_id)
        
        scan_id = await save_scan(user_id, "SAST", result["target"], result)
        result["scan_id"] = scan_id
        
        # Add remaining scans info to response
        subscription = await get_user_subscription(user_id)
        plan = subscription.get("plan", "free") if subscription else "free"
        limits = {"free": 5, "pro": 100, "team": 999999}
        limit = limits.get(plan, 5)
        
        month_key = datetime.utcnow().strftime("%Y-%m")
        usage = await db.usage_collection.find_one({"user_id": user_id, "month": month_key})
        scans_remaining = max(0, limit - (usage.get("scans_used", 0) if usage else 1))
        
        result["scans_remaining"] = scans_remaining
        result["plan"] = plan
        
        return result

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


class DASTRequest(BaseModel):
    url: str


async def dast_scan(request: DASTRequest, user_id: str):
    """DAST scan with usage limit checking"""
    url = request.url

    if not url.startswith("http://") and not url.startswith("https://"):
        raise HTTPException(
            status_code=400,
            detail="URL must start with http:// or https://"
        )

    # Check if user has scans remaining this month
    if not await check_scan_limit(user_id):
        subscription = await get_user_subscription(user_id)
        plan = subscription.get("plan", "free") if subscription else "free"
        
        limits = {"free": 5, "pro": 100, "team": 999999}
        limit = limits.get(plan, 5)
        
        raise HTTPException(
            status_code=403, 
            detail=f"Monthly scan limit reached ({limit}/{limit} scans). Upgrade to Pro for more scans."
        )

    # Run blocking DAST scan in thread pool
    vulnerabilities = await asyncio.to_thread(run_dast_scan, url)

    # Run AI analysis in thread pool
    vulnerabilities = await asyncio.to_thread(analyze_vulnerabilities, vulnerabilities)

    result = {
        "type": "DAST",
        "target": url,
        "url": url,
        "total": len(vulnerabilities),
        "critical": len([v for v in vulnerabilities if v.get("severity") == "critical"]),
        "high": len([v for v in vulnerabilities if v.get("severity") == "high"]),
        "medium": len([v for v in vulnerabilities if v.get("severity") == "medium"]),
        "low": len([v for v in vulnerabilities if v.get("severity") == "low"]),
        "vulnerabilities": vulnerabilities
    }

    # Increment scan count after successful scan
    await increment_scan_count(user_id)
    
    scan_id = await save_scan(user_id, "DAST", url, result)
    result["scan_id"] = scan_id
    
    # Add remaining scans info to response
    subscription = await get_user_subscription(user_id)
    plan = subscription.get("plan", "free") if subscription else "free"
    limits = {"free": 5, "pro": 100, "team": 999999}
    limit = limits.get(plan, 5)
    
    month_key = datetime.utcnow().strftime("%Y-%m")
    usage = await db.usage_collection.find_one({"user_id": user_id, "month": month_key})
    scans_remaining = max(0, limit - (usage.get("scans_used", 0) if usage else 1))
    
    result["scans_remaining"] = scans_remaining
    result["plan"] = plan
    
    return result


class GitScanRequest(BaseModel):
    repo_url: str


async def git_scan(request: GitScanRequest, user_id: str):
    """Git repository scan with usage limit checking"""
    url = request.repo_url

    if not url.startswith("https://github.com") and not url.startswith("https://gitlab.com"):
        raise HTTPException(
            status_code=400,
            detail="Only GitHub and GitLab repositories are supported"
        )

    # Check if user has scans remaining this month
    if not await check_scan_limit(user_id):
        subscription = await get_user_subscription(user_id)
        plan = subscription.get("plan", "free") if subscription else "free"
        
        limits = {"free": 5, "pro": 100, "team": 999999}
        limit = limits.get(plan, 5)
        
        raise HTTPException(
            status_code=403, 
            detail=f"Monthly scan limit reached ({limit}/{limit} scans). Upgrade to Pro for more scans."
        )

    # Run blocking git scan in thread pool
    scan_result = await asyncio.to_thread(clone_and_scan, url)

    if not scan_result["success"]:
        raise HTTPException(
            status_code=400,
            detail=scan_result.get("error", "Failed to clone repository")
        )

    # Run AI analysis in thread pool
    vulnerabilities = await asyncio.to_thread(
        analyze_vulnerabilities, scan_result["vulnerabilities"]
    )

    result = {
        "type": "SAST",
        "target": url,
        "filename": url.split("/")[-1],
        "languages": scan_result.get("languages", []),
        "total": len(vulnerabilities),
        "critical": len([v for v in vulnerabilities if v.get("severity") == "critical"]),
        "high": len([v for v in vulnerabilities if v.get("severity") == "high"]),
        "medium": len([v for v in vulnerabilities if v.get("severity") == "medium"]),
        "low": len([v for v in vulnerabilities if v.get("severity") == "low"]),
        "vulnerabilities": vulnerabilities
    }

    # Increment scan count after successful scan
    await increment_scan_count(user_id)
    
    scan_id = await save_scan(user_id, "SAST", url, result)
    result["scan_id"] = scan_id
    
    # Add remaining scans info to response
    subscription = await get_user_subscription(user_id)
    plan = subscription.get("plan", "free") if subscription else "free"
    limits = {"free": 5, "pro": 100, "team": 999999}
    limit = limits.get(plan, 5)
    
    month_key = datetime.utcnow().strftime("%Y-%m")
    usage = await db.usage_collection.find_one({"user_id": user_id, "month": month_key})
    scans_remaining = max(0, limit - (usage.get("scans_used", 0) if usage else 1))
    
    result["scans_remaining"] = scans_remaining
    result["plan"] = plan
    
    return result


async def get_user_scan_usage(user_id: str):
    """Get current user's scan usage statistics"""
    subscription = await get_user_subscription(user_id)
    plan = subscription.get("plan", "free") if subscription else "free"
    
    limits = {"free": 5, "pro": 100, "team": 999999}
    limit = limits.get(plan, 5)
    
    month_key = datetime.utcnow().strftime("%Y-%m")
    usage = await db.usage_collection.find_one({"user_id": user_id, "month": month_key})
    scans_used = usage.get("scans_used", 0) if usage else 0
    
    # Get reset date (first day of next month)
    now = datetime.utcnow()
    if now.month == 12:
        reset_date = datetime(now.year + 1, 1, 1)
    else:
        reset_date = datetime(now.year, now.month + 1, 1)
    
    return {
        "plan": plan,
        "limit": limit,
        "used": scans_used,
        "remaining": max(0, limit - scans_used),
        "reset_date": reset_date.isoformat()
    }