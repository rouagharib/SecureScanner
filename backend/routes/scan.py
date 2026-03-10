from fastapi import APIRouter, UploadFile, File
from controllers.scan_controller import sast_scan

router = APIRouter(prefix="/api/scan", tags=["Scanning"])

@router.post("/sast")
async def sast_route(file: UploadFile = File(...)):
    return await sast_scan(file)