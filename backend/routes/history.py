from fastapi import APIRouter
from database import SessionLocal
from models.scan import Scan

router = APIRouter(prefix="/api/history", tags=["History"])

@router.get("/")
def get_history():
    db = SessionLocal()
    try:
        scans = db.query(Scan).order_by(Scan.created_at.desc()).all()
        return [
            {
                "id": s.id,
                "type": s.type,
                "target": s.target,
                "status": s.status,
                "total": s.results.get("total", 0) if s.results else 0,
                "critical": s.results.get("critical", 0) if s.results else 0,
                "high": s.results.get("high", 0) if s.results else 0,
                "medium": s.results.get("medium", 0) if s.results else 0,
                "low": s.results.get("low", 0) if s.results else 0,
                "date": s.created_at.strftime("%b %d, %Y") if s.created_at else "",
            }
            for s in scans
        ]
    finally:
        db.close()

@router.get("/stats")
def get_stats():
    db = SessionLocal()
    try:
        scans = db.query(Scan).all()
        total_scans = len(scans)
        total_vulns = sum(s.results.get("total", 0) for s in scans if s.results)
        critical = sum(s.results.get("critical", 0) for s in scans if s.results)
        high = sum(s.results.get("high", 0) for s in scans if s.results)
        return {
            "total_scans": total_scans,
            "total_vulnerabilities": total_vulns,
            "critical": critical,
            "high": high,
        }
    finally:
        db.close()

@router.get("/{scan_id}/full")
def get_full_scan(scan_id: int):
    db = SessionLocal()
    try:
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if not scan:
            return {"error": "Scan not found"}
        return {
            "id": scan.id,
            "type": scan.type,
            "target": scan.target,
            "status": scan.status,
            "results": scan.results,
            "date": scan.created_at.strftime("%b %d, %Y") if scan.created_at else "",
        }
    finally:
        db.close()