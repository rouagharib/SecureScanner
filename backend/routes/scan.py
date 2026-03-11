from fastapi import APIRouter, UploadFile, File
from fastapi.responses import Response
from controllers.scan_controller import sast_scan, dast_scan, DASTRequest
from services.report_service import generate_pdf_report

router = APIRouter(prefix="/api/scan", tags=["Scanning"])

@router.post("/sast")
async def sast_route(file: UploadFile = File(...)):
    return await sast_scan(file)

@router.post("/dast")
async def dast_route(request: DASTRequest):
    return await dast_scan(request)

@router.post("/report")
async def report_route(scan_data: dict):
    pdf = generate_pdf_report(scan_data)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=securescan-report.pdf"}
    )