from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.responses import Response
from typing import List
from controllers.scan_controller import sast_scan, dast_scan, git_scan, DASTRequest, GitScanRequest
from services.report_service import generate_pdf_report
from services.token_service import verify_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/api/scan", tags=["Scanning"])
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload

@router.post("/sast")
async def sast_route(files: List[UploadFile] = File(...), user=Depends(get_current_user)):
    return await sast_scan(files, user["id"])

@router.post("/git")
async def git_route(request: GitScanRequest, user=Depends(get_current_user)):
    return await git_scan(request, user["id"])

@router.post("/dast")
async def dast_route(request: DASTRequest, user=Depends(get_current_user)):
    return await dast_scan(request, user["id"])

@router.post("/report")
async def report_route(scan_data: dict):
    pdf = generate_pdf_report(scan_data)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=securescan-report.pdf"}
    )