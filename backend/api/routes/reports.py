import hashlib
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from auth import current_user
from config.settings import settings
from db import get_db
from models.entities import Issue, Report, StatusEvent, User
from schemas.issue import StatusEventOut
from schemas.report import ReportOut
from services.ai import analyze_civic_image, validate_pothole_image
from services.issues import can_view_report, create_or_join_issue
from services.rewards import award_points

from utils.security import (
    sanitize_text,
    validate_image_magic_bytes,
    validate_video_magic_bytes,
)

router = APIRouter()
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime", "video/x-matroska", "video/mov"}
MAX_BYTES = 10 * 1024 * 1024
MAX_VIDEO_BYTES = 30 * 1024 * 1024

def serialize(report: Report, db: Session | None = None) -> ReportOut:
    current_status = report.status
    priority = "medium"
    department = "Municipal Services"
    if db and report.issue_id:
        issue = db.get(Issue, report.issue_id)
        if issue:
            if issue.status:
                current_status = issue.status
                if report.status != current_status:
                    report.status = current_status
            if issue.priority:
                priority = issue.priority
            if issue.department:
                department = issue.department

    return ReportOut.model_validate(report, from_attributes=True).model_copy(update={
        "status": current_status,
        "priority": priority,
        "department": department,
        "evidence_url": f"/api/reports/{report.id}/evidence" if report.evidence_path else None,
        "video_url": f"/api/reports/{report.id}/video" if report.video_path else None,
    })

def find_report(db: Session, report_ref: str) -> Report | None:
    if report_ref.isdigit():
        return db.get(Report, int(report_ref))
    return db.query(Report).filter(Report.reference_code == report_ref.upper()).first()

@router.get("", response_model=list[ReportOut])
def list_reports(user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role == "worker":
        raise HTTPException(403, "Workers can only access assigned issues")
    query = db.query(Report)
    if user.role == "citizen":
        query = query.filter(Report.reporter_id == user.id)
    reports = query.order_by(Report.created_at.desc()).all()
    res = [serialize(r, db) for r in reports]
    db.commit()
    return res

@router.get("/activity", response_model=list[StatusEventOut])
def activity(user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role == "worker":
        raise HTTPException(403, "Workers can only access assigned issues")
    query = db.query(StatusEvent)
    if user.role == "citizen":
        issue_ids = [report.issue_id for report in db.query(Report).filter(Report.reporter_id == user.id, Report.issue_id.isnot(None)).all()]
        query = query.filter(StatusEvent.issue_id.in_(issue_ids or [-1]))
    return query.order_by(StatusEvent.created_at.desc()).limit(20).all()

@router.get("/{report_ref}", response_model=ReportOut)
def get_report(report_ref: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    report = find_report(db, report_ref)
    if not report or not can_view_report(db, user, report):
        raise HTTPException(404, "Report not found")
    res = serialize(report, db)
    db.commit()
    return res


@router.get("/{report_ref}/evidence")
def get_evidence(report_ref: str, db: Session = Depends(get_db)):
    report = find_report(db, report_ref)
    if not report:
        raise HTTPException(404, "Report not found")
    evidence = Path(settings.upload_dir, report.evidence_path or "")
    if not report.evidence_path or not evidence.is_file():
        raise HTTPException(404, "Evidence not found")
    return FileResponse(evidence)

@router.get("/{report_ref}/video")
def get_video(report_ref: str, db: Session = Depends(get_db)):
    report = find_report(db, report_ref)
    if not report:
        raise HTTPException(404, "Report not found")
    video = Path(settings.upload_dir, report.video_path or "")
    if not report.video_path or not video.is_file():
        raise HTTPException(404, "Video evidence not found")
    return FileResponse(video)


@router.post("/analyze")
async def analyze_image(
    evidence: UploadFile = File(...),
    category: str | None = Form(None),
    user: User = Depends(current_user),
):
    if evidence.content_type not in ALLOWED_TYPES:
        raise HTTPException(415, "Upload a JPG, PNG, or WEBP image")
    content = await evidence.read()
    if not content or len(content) > MAX_BYTES:
        raise HTTPException(413, "Image must be smaller than 10MB")
    
    # Binary magic bytes validation
    validate_image_magic_bytes(content)
    
    clean_category = sanitize_text(category, max_length=60) if category else None
    return await analyze_civic_image(content, evidence.content_type, category_hint=clean_category)

@router.post("", response_model=ReportOut, status_code=201)
async def create_report(
    title: str = Form(..., min_length=4, max_length=240),
    description: str | None = Form(None),
    category: str = Form("road_infrastructure"),
    latitude: float = Form(..., ge=-90, le=90),
    longitude: float = Form(..., ge=-180, le=180),
    evidence: UploadFile = File(...),
    video: UploadFile | None = File(None),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    if user.role != "citizen":
        raise HTTPException(403, "Only citizens can submit civic reports")
    if evidence.content_type not in ALLOWED_TYPES:
        raise HTTPException(415, "Upload a JPG, PNG, or WEBP image")
    content = await evidence.read()
    if not content or len(content) > MAX_BYTES:
        raise HTTPException(413, "Image must be smaller than 10MB")
    
    # Binary magic byte inspection
    detected_mime = validate_image_magic_bytes(content)
    digest = hashlib.sha256(content).hexdigest()
    
    try:
        ai_result = await validate_pothole_image(content, detected_mime, category=category)
    except Exception as exc:
        raise HTTPException(503, f"AI validation unavailable: {exc}") from exc
    if ai_result.get("decision") == "reject":
        raise HTTPException(422, str(ai_result.get("message", "This image does not appear to show a valid civic issue.")))
    if ai_result.get("decision") == "review":
        raise HTTPException(422, "Please upload a clearer image for review")
    
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    # Safe UUID filename to prevent path traversal
    ext = "jpg" if "jpeg" in detected_mime else "png" if "png" in detected_mime else "webp"
    filename = f"{uuid.uuid4().hex}.{ext}"
    Path(settings.upload_dir, filename).write_bytes(content)

    video_filename = None
    if video and video.filename:
        v_content = await video.read()
        if v_content and len(v_content) <= MAX_VIDEO_BYTES:
            validate_video_magic_bytes(v_content)
            v_ext = video.filename.rsplit('.', 1)[-1].lower().strip()
            if v_ext not in {"mp4", "webm", "mov"}:
                v_ext = "mp4"
            video_filename = f"v_{uuid.uuid4().hex}.{v_ext}"
            Path(settings.upload_dir, video_filename).write_bytes(v_content)

    # Sanitize user text inputs
    clean_title = sanitize_text(title, max_length=240)
    clean_description = sanitize_text(description, max_length=2000) if description else None

    report = Report(
        reference_code=f"CP-{uuid.uuid4().hex[:6].upper()}",
        reporter_id=user.id,
        title=clean_title,
        description=clean_description,
        evidence_path=filename,
        evidence_sha256=digest,
        video_path=video_filename,
        latitude=latitude,
        longitude=longitude,
    )
    detected_category = str(ai_result.get("category", category))
    detected_subtype = str(ai_result.get("subtype", "civic_issue"))
    db.add(report)
    db.flush()
    issue = create_or_join_issue(db, report, category=detected_category, subtype=detected_subtype)
    
    # Award reward points to citizen for verified authentic civic submission
    award_points(db, user, 50, "Verified civic report submitted", issue.id)
    
    db.commit()
    db.refresh(report)
    return serialize(report)

