from fastapi import APIRouter, UploadFile, File
from controllers.scan_controller import sast_scan, dast_scan, DASTRequest

router = APIRouter(prefix="/api/scan", tags=["Scanning"])

@router.post("/sast")
async def sast_route(file: UploadFile = File(...)):
    return await sast_scan(file)

@router.post("/dast")
async def dast_route(request: DASTRequest):
    return await dast_scan(request)