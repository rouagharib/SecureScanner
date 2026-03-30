import os
import tempfile
import shutil
from fastapi import UploadFile, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import SessionLocal
from services.sast_service import run_scan, extract_zip
from services.dast_service import run_dast_scan
from services.ai_service import enrich_with_ai 
from models.scan import Scan

ALLOWED_EXTENSIONS = {".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".php", ".go", ".rb", ".c", ".cpp", ".zip"}

def save_scan(type: str, target: str, results: dict):
    db = SessionLocal()
    try:
        scan = Scan(
            user_id=1,
            type=type,
            target=target,
            status="completed",
            results=results
        )
        db.add(scan)
        db.commit()
        db.refresh(scan)
        return scan.id
    finally:
        db.close()

async def sast_scan(file: UploadFile):
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

        # Run smart scan
        scan_result = run_scan(scan_path)
        vulnerabilities = scan_result["vulnerabilities"]
        languages = scan_result["languages"]

         # ── AI ENRICHMENT ──────────────────────────────────────
        # For each vulnerability Bandit/Semgrep found, ask the AI
        # to also classify it and assess its risk
        for vuln in vulnerabilities:
            ai_result = enrich_with_ai(vuln.get("code", ""))
            if ai_result:
                vuln.update(ai_result)   # adds ai_vulnerability_type + ai_risk_level
        # ──────────────────────────────────────────────────────


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

        scan_id = save_scan("SAST", filename, result)
        result["scan_id"] = scan_id

        return result

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


class DASTRequest(BaseModel):
    url: str

async def dast_scan(request: DASTRequest):
    url = request.url

    if not url.startswith("http://") and not url.startswith("https://"):
        raise HTTPException(
            status_code=400,
            detail="URL must start with http:// or https://"
        )

    vulnerabilities = run_dast_scan(url)

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

    scan_id = save_scan("DAST", url, result)
    result["scan_id"] = scan_id

    return result

