import os
import tempfile
import shutil
from fastapi import UploadFile, HTTPException
from pydantic import BaseModel
from services.sast_service import run_bandit_scan, extract_zip
from services.dast_service import run_dast_scan

ALLOWED_EXTENSIONS = {".py", ".zip"}

async def sast_scan(file: UploadFile):
    # Check file extension
    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Only .py and .zip files are supported"
        )

    # Create a temp folder to work in
    temp_dir = tempfile.mkdtemp()

    try:
        # Save uploaded file to temp folder
        file_path = os.path.join(temp_dir, filename)
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)

        # If zip, extract it and scan the folder
        if ext == ".zip":
            extract_to = os.path.join(temp_dir, "extracted")
            os.makedirs(extract_to)
            extract_zip(file_path, extract_to)
            scan_path = extract_to
        else:
            scan_path = file_path

        # Run Bandit
        vulnerabilities = run_bandit_scan(scan_path)

        return {
            "filename": filename,
            "total": len(vulnerabilities),
            "critical": len([v for v in vulnerabilities if v["severity"] == "high"]),
            "medium": len([v for v in vulnerabilities if v["severity"] == "medium"]),
            "low": len([v for v in vulnerabilities if v["severity"] == "low"]),
            "vulnerabilities": vulnerabilities
        }

    finally:
        # Always clean up temp files
        shutil.rmtree(temp_dir, ignore_errors=True)


class DASTRequest(BaseModel):
    url: str

async def dast_scan(request: DASTRequest):
    url = request.url

    # Basic URL validation
    if not url.startswith("http://") and not url.startswith("https://"):
        raise HTTPException(
            status_code=400,
            detail="URL must start with http:// or https://"
        )

    vulnerabilities = run_dast_scan(url)

    return {
        "url": url,
        "total": len(vulnerabilities),
        "critical": len([v for v in vulnerabilities if v["severity"] == "critical"]),
        "high": len([v for v in vulnerabilities if v["severity"] == "high"]),
        "medium": len([v for v in vulnerabilities if v["severity"] == "medium"]),
        "low": len([v for v in vulnerabilities if v["severity"] == "low"]),
        "vulnerabilities": vulnerabilities
    }