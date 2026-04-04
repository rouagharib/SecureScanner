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
from services.git_service import clone_and_scan

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

async def sast_scan(files: list[UploadFile], user_id: str):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    temp_dir = tempfile.mkdtemp()

    try:
        all_vulnerabilities = []
        all_languages = set()

        for file in files:
            filename = file.filename
            ext = os.path.splitext(filename)[1].lower()

            if ext not in ALLOWED_EXTENSIONS:
                continue

            # Preserve folder structure using filename path
            file_path = os.path.join(temp_dir, filename.replace('/', os.sep).replace('\\', os.sep))
            os.makedirs(os.path.dirname(file_path), exist_ok=True)

            with open(file_path, "wb") as f:
                content = await file.read()
                f.write(content)

            if ext == ".zip":
                extract_to = os.path.join(temp_dir, "extracted")
                os.makedirs(extract_to, exist_ok=True)
                extract_zip(file_path, extract_to)
                scan_result = run_scan(extract_to)
            else:
                scan_result = run_scan(file_path)

            all_vulnerabilities.extend(scan_result["vulnerabilities"])
            all_languages.update(scan_result["languages"])

        # Run AI layer on all findings
        all_vulnerabilities = analyze_vulnerabilities(all_vulnerabilities)

        result = {
            "type": "SAST",
            "target": f"{len(files)} files",
            "filename": f"{len(files)} files",
            "languages": list(all_languages),
            "total": len(all_vulnerabilities),
            "critical": len([v for v in all_vulnerabilities if v["severity"] == "critical"]),
            "high": len([v for v in all_vulnerabilities if v["severity"] == "high"]),
            "medium": len([v for v in all_vulnerabilities if v["severity"] == "medium"]),
            "low": len([v for v in all_vulnerabilities if v["severity"] == "low"]),
            "vulnerabilities": all_vulnerabilities
        }

        scan_id = await save_scan(user_id, "SAST", result["target"], result)
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
class GitScanRequest(BaseModel):
    repo_url: str

async def git_scan(request: GitScanRequest, user_id: str):
    url = request.repo_url

    # Basic validation
    if not url.startswith("https://github.com") and not url.startswith("https://gitlab.com"):
        raise HTTPException(
            status_code=400,
            detail="Only GitHub and GitLab repositories are supported"
        )

    scan_result = clone_and_scan(url)

    if not scan_result["success"]:
        raise HTTPException(
            status_code=400,
            detail=scan_result["error"]
        )

    vulnerabilities = scan_result["vulnerabilities"]
    languages = scan_result["languages"]

    # Run AI layer
    vulnerabilities = analyze_vulnerabilities(vulnerabilities)

    result = {
        "type": "SAST",
        "target": url,
        "filename": url.split("/")[-1],
        "languages": languages,
        "total": len(vulnerabilities),
        "critical": len([v for v in vulnerabilities if v["severity"] == "critical"]),
        "high": len([v for v in vulnerabilities if v["severity"] == "high"]),
        "medium": len([v for v in vulnerabilities if v["severity"] == "medium"]),
        "low": len([v for v in vulnerabilities if v["severity"] == "low"]),
        "vulnerabilities": vulnerabilities
    }

    scan_id = await save_scan(user_id, "SAST", url, result)
    result["scan_id"] = scan_id
    return result