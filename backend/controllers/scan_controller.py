import os
import tempfile
import shutil
from datetime import datetime
from fastapi import UploadFile, HTTPException
from pydantic import BaseModel
from database import scans_collection
from services.sast_service import run_scan, extract_zip
from services.dast_service import run_dast_scan
from services.ai_service import analyze_vulnerabilities

ALLOWED_EXTENSIONS = {".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".php", ".go", ".rb", ".c", ".cpp", ".zip"}

async def save_scan(user_id: str, type: str, target: str, results: dict):
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

async def sast_scan(file: UploadFile, user_id: str):
    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Supported: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    temp_dir = tempfile.mkdtemp()

    try:
        file_path = os.path.join(temp_dir, filename)
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)

        if ext == ".zip":
            extract_to = os.path.join(temp_dir, "extracted")
            os.makedirs(extract_to)
            extract_zip(file_path, extract_to)
            scan_path = extract_to
        else:
            scan_path = file_path

        scan_result = run_scan(scan_path)
        vulnerabilities = scan_result["vulnerabilities"]
        languages = scan_result["languages"]

        # ── AI LAYER ──────────────────────────────────────
        vulnerabilities = analyze_vulnerabilities(vulnerabilities)

        result = {
            "type": "SAST",
            "target": filename,
            "filename": filename,
            "languages": languages,
            "total": len(vulnerabilities),
            "critical": len([v for v in vulnerabilities if v["severity"] == "critical"]),
            "high": len([v for v in vulnerabilities if v["severity"] == "high"]),
            "medium": len([v for v in vulnerabilities if v["severity"] == "medium"]),
            "low": len([v for v in vulnerabilities if v["severity"] == "low"]),
            "vulnerabilities": vulnerabilities
        }

        scan_id = await save_scan(user_id, "SAST", filename, result)
        result["scan_id"] = scan_id
        return result

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


class DASTRequest(BaseModel):
    url: str

async def dast_scan(request: DASTRequest, user_id: str):
    url = request.url

    if not url.startswith("http://") and not url.startswith("https://"):
        raise HTTPException(
            status_code=400,
            detail="URL must start with http:// or https://"
        )

    vulnerabilities = run_dast_scan(url)

    # ── AI LAYER ──────────────────────────────────────────
    vulnerabilities = analyze_vulnerabilities(vulnerabilities)

    result = {
        "type": "DAST",
        "target": url,
        "url": url,
        "total": len(vulnerabilities),
        "critical": len([v for v in vulnerabilities if v["severity"] == "critical"]),
        "high": len([v for v in vulnerabilities if v["severity"] == "high"]),
        "medium": len([v for v in vulnerabilities if v["severity"] == "medium"]),
        "low": len([v for v in vulnerabilities if v["severity"] == "low"]),
        "vulnerabilities": vulnerabilities
    }

    scan_id = await save_scan(user_id, "DAST", url, result)
    result["scan_id"] = scan_id
    return result