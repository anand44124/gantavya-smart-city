import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session
from auth import current_user
from config.settings import settings
from db import get_db
from models.entities import Assignment, Issue, RepairEvidence, User
from schemas.issue import IssueOut
from schemas.worker import WorkerOut
from services.ai import validate_resolution_proof
from services.issues import record_status, to_issue_out, worker_can_access
from utils.security import (
    sanitize_text,
    validate_image_magic_bytes,
    validate_video_magic_bytes,
)

router = APIRouter()
ALLOWED_IMG = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_VID = {"video/mp4", "video/webm", "video/quicktime", "video/x-matroska", "video/mov"}

@router.get("", response_model=list[WorkerOut])
def list_workers(user: User = Depends(current_user), db: Session = Depends(get_db)) -> list[WorkerOut]:
    if user.role != "admin":
        raise HTTPException(403, "Admin access required")
    workers = db.query(User).filter(User.role == "worker").all()
    return [
        WorkerOut(
            id=worker.id,
            name=worker.full_name,
            assigned_issue_count=db.query(Assignment).filter(
                Assignment.worker_id == worker.id, Assignment.status != "completed"
            ).count(),
        )
        for worker in workers
    ]

@router.get("/me/issues", response_model=list[IssueOut])
def assigned_issues(user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role != "worker":
        raise HTTPException(403, "Worker access required")
    assignments = db.query(Assignment).filter(
        Assignment.worker_id == user.id,
        Assignment.status.not_in(["completed", "resolved", "cancelled"]),
    ).all()
    ids = [assignment.issue_id for assignment in assignments]
    if not ids:
        return []
    active_issues = db.query(Issue).filter(
        Issue.id.in_(ids),
        Issue.status.not_in(["resolved", "verified_closed", "completed", "rejected"]),
    ).all()
    return [to_issue_out(db, issue) for issue in active_issues]

@router.patch("/me/issues/{issue_id}/status", response_model=IssueOut)
def update_assigned_issue(
    issue_id: int,
    status: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    if user.role != "worker":
        raise HTTPException(403, "Worker access required")
    issue = db.get(Issue, issue_id)
    assignment = db.query(Assignment).filter(
        Assignment.issue_id == issue_id, Assignment.worker_id == user.id
    ).first()
    if not assignment or not issue or not worker_can_access(db, user, issue_id):
        raise HTTPException(404, "Assigned issue not found")
    if status not in {"in_progress", "completed", "resolved"}:
        raise HTTPException(422, "Workers may set in_progress or resolve")
    if status in {"completed", "resolved"}:
        raise HTTPException(422, "To resolve an issue, submit mandatory resolution photo proof via the resolution form.")
    assignment.status = status
    record_status(db, issue, user, status, "Field update: Work in progress by assigned worker")
    db.commit()
    db.refresh(issue)
    return to_issue_out(db, issue)

@router.post("/me/issues/validate-proof")
async def validate_proof_prescan(
    photo: UploadFile = File(...),
    category: str = Form("road_infrastructure"),
    user: User = Depends(current_user),
):
    if user.role != "worker":
        raise HTTPException(403, "Worker access required")
    if photo.content_type not in ALLOWED_IMG:
        raise HTTPException(415, "Resolution photo must be JPG, PNG, or WEBP")
    photo_bytes = await photo.read()
    if not photo_bytes or len(photo_bytes) > 12 * 1024 * 1024:
        raise HTTPException(413, "Photo must be less than 12MB")
    
    # Binary magic byte inspection
    detected_mime = validate_image_magic_bytes(photo_bytes)
    clean_cat = sanitize_text(category, max_length=60)
    return await validate_resolution_proof(photo_bytes, detected_mime, clean_cat)

@router.post("/me/issues/{issue_id}/resolve-proof", response_model=IssueOut)
@router.post("/me/issues/{issue_id}/resolve", response_model=IssueOut)
async def resolve_assigned_issue(
    issue_id: int,
    photo: UploadFile = File(...),
    video: UploadFile | None = File(None),
    notes: str | None = Form(None),
    note: str | None = Form(None),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    if user.role != "worker":
        raise HTTPException(403, "Worker access required")
    issue = db.get(Issue, issue_id)
    assignment = db.query(Assignment).filter(
        Assignment.issue_id == issue_id, Assignment.worker_id == user.id
    ).first()
    if not assignment or not issue or not worker_can_access(db, user, issue_id):
        raise HTTPException(404, "Assigned issue not found")
    if photo.content_type not in ALLOWED_IMG:
        raise HTTPException(415, "Resolution photo must be JPG, PNG, or WEBP")

    photo_bytes = await photo.read()
    if not photo_bytes or len(photo_bytes) > 12 * 1024 * 1024:
        raise HTTPException(413, "Photo must be less than 12MB")

    # Binary magic byte inspection
    detected_mime = validate_image_magic_bytes(photo_bytes)

    # AI vision inspection of officer's resolution proof photo
    try:
        ai_res = await validate_resolution_proof(photo_bytes, detected_mime, issue.category)
        if ai_res.get("decision") == "reject":
            raise HTTPException(
                422,
                f"Resolution proof rejected by AI: {ai_res.get('reason', 'This photo does not appear to show verified repaired public infrastructure.')}",
            )
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[Worker Resolution Proof Inspection Notice] {exc}")

    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    ext = "jpg" if "jpeg" in detected_mime else "png" if "png" in detected_mime else "webp"
    photo_filename = f"proof_{uuid.uuid4().hex}.{ext}"
    Path(settings.upload_dir, photo_filename).write_bytes(photo_bytes)

    video_filename = None
    if video and video.filename:
        v_bytes = await video.read()
        if v_bytes and len(v_bytes) <= 30 * 1024 * 1024:
            validate_video_magic_bytes(v_bytes)
            v_ext = video.filename.rsplit(".", 1)[-1].lower().strip()
            if v_ext not in {"mp4", "webm", "mov"}:
                v_ext = "mp4"
            video_filename = f"proof_v_{uuid.uuid4().hex}.{v_ext}"
            Path(settings.upload_dir, video_filename).write_bytes(v_bytes)

    raw_note = notes or note or "Repairs completed and site cleared."
    clean_note = sanitize_text(raw_note, max_length=1000)

    evidence = RepairEvidence(
        issue_id=issue_id,
        worker_id=user.id,
        kind="photo",
        path=photo_filename,
        video_path=video_filename,
        notes=clean_note,
    )
    db.add(evidence)
    assignment.status = "completed"
    record_status(db, issue, user, "resolved", f"Officer resolution proof submitted: {clean_note}")
    db.commit()
    db.refresh(issue)
    return to_issue_out(db, issue)
