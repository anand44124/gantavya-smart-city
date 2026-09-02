from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from auth import current_user
from config.settings import settings
from db import get_db
from models.entities import CommunityVerification, Issue, RepairEvidence, Report, StatusEvent, User
from schemas.issue import CitizenConfirmIn, IssueOut, ResolutionProofOut, StatusChange, StatusEventOut, VerifyIn
from schemas.report import ReportOut
from services.issues import can_view_issue, record_status, to_issue_out
from services.rewards import award_points
from utils.security import sanitize_text

router = APIRouter()

def serialize_report(report: Report) -> ReportOut:
    return ReportOut.model_validate(report, from_attributes=True).model_copy(update={
        "evidence_url": f"/api/reports/{report.id}/evidence" if report.evidence_path else None,
        "video_url": f"/api/reports/{report.id}/video" if report.video_path else None,
    })

@router.get("", response_model=list[IssueOut])
def list_issues(db: Session = Depends(get_db)):
    return [to_issue_out(db, issue) for issue in db.query(Issue).order_by(Issue.updated_at.desc()).all()]

@router.get("/evidence/{evidence_id}/file")
def get_repair_evidence_file(evidence_id: int, db: Session = Depends(get_db)):
    evidence = db.get(RepairEvidence, evidence_id)
    if not evidence or not evidence.path:
        raise HTTPException(404, "Resolution photo evidence not found")
    file_path = Path(settings.upload_dir, evidence.path)
    if not file_path.is_file():
        raise HTTPException(404, "Evidence file missing on server")
    return FileResponse(file_path)

@router.get("/evidence/{evidence_id}/video")
def get_repair_evidence_video(evidence_id: int, db: Session = Depends(get_db)):
    evidence = db.get(RepairEvidence, evidence_id)
    if not evidence or not evidence.video_path:
        raise HTTPException(404, "Resolution video evidence not found")
    file_path = Path(settings.upload_dir, evidence.video_path)
    if not file_path.is_file():
        raise HTTPException(404, "Video file missing on server")
    return FileResponse(file_path)


@router.get("/{issue_id}", response_model=IssueOut)
def get_issue(issue_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    issue = db.get(Issue, issue_id)
    if not issue or not can_view_issue(db, user, issue):
        raise HTTPException(404, "Issue not found")
    return to_issue_out(db, issue)

@router.get("/{issue_id}/events", response_model=list[StatusEventOut])
def issue_events(issue_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    issue = db.get(Issue, issue_id)
    if not issue or not can_view_issue(db, user, issue):
        raise HTTPException(404, "Issue not found")
    return db.query(StatusEvent).filter(StatusEvent.issue_id == issue_id).order_by(StatusEvent.created_at.asc()).all()

@router.get("/{issue_id}/reports", response_model=list[ReportOut])
def issue_reports(issue_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    issue = db.get(Issue, issue_id)
    if not issue or not can_view_issue(db, user, issue):
        raise HTTPException(404, "Issue not found")
    return [serialize_report(report) for report in db.query(Report).filter(Report.issue_id == issue_id).order_by(Report.created_at.desc()).all()]

@router.post("/{issue_id}/verify", response_model=IssueOut)
def verify_issue(issue_id: int, payload: VerifyIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role != "citizen":
        raise HTTPException(403, "Community verification is for citizen accounts")
    if payload.result not in {"still_present", "fixed"}:
        raise HTTPException(422, "Verification must be still_present or fixed")
    issue = db.get(Issue, issue_id)
    if not issue:
        raise HTTPException(404, "Issue not found")
    existing = db.query(CommunityVerification).filter(CommunityVerification.issue_id == issue_id, CommunityVerification.citizen_id == user.id).first()
    if existing:
        existing.result = payload.result
    else:
        db.add(CommunityVerification(issue_id=issue_id, citizen_id=user.id, result=payload.result))
        award_points(db, user, 15, "Community verification contribution", issue.id)

    if payload.result == "fixed" and issue.status in {"completed", "resolved", "verification_required"}:
        record_status(db, issue, user, "verified_closed", "Community confirmed issue is fixed")
    db.commit(); db.refresh(issue)
    return to_issue_out(db, issue)

@router.post("/{issue_id}/citizen-confirm", response_model=IssueOut)
def citizen_confirm_resolution(issue_id: int, payload: CitizenConfirmIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role != "citizen":
        raise HTTPException(403, "Citizen review access required")
    issue = db.get(Issue, issue_id)
    if not issue:
        raise HTTPException(404, "Issue not found")
    
    # Check if user is a reporter or community citizen
    reports = db.query(Report).filter(Report.issue_id == issue_id).all()
    reporter_ids = {r.reporter_id for r in reports}

    clean_feedback = sanitize_text(payload.feedback, max_length=500) if payload.feedback else ""
    if payload.decision == "accept":
        note_text = f"Citizen verified resolution proof and accepted closure. Notes: {clean_feedback or 'Work approved.'}"
        record_status(db, issue, user, "verified_closed", note_text)
        # Award 100 bonus points to citizen reporters
        for r in reports:
            rep_user = db.get(User, r.reporter_id)
            if rep_user:
                award_points(db, rep_user, 100, "Issue resolution verified & confirmed", issue.id)
    else:
        note_text = f"Citizen requested rework / rejected resolution: {clean_feedback or 'Proof incomplete or issue persists.'}"
        record_status(db, issue, user, "in_progress", note_text)

    db.commit()
    db.refresh(issue)
    return to_issue_out(db, issue)

@router.patch("/{issue_id}/status", response_model=IssueOut)
def change_status(issue_id: int, payload: StatusChange, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role not in {"admin", "worker"}:
        raise HTTPException(403, "Staff access required")
    allowed = {"reported", "acknowledged", "assigned", "in_progress", "completed", "resolved", "verification_required", "verified_closed", "rejected"}
    if payload.status not in allowed:
        raise HTTPException(422, "Invalid issue status")
    issue = db.get(Issue, issue_id)
    if not issue or not can_view_issue(db, user, issue):
        raise HTTPException(404, "Issue not found")
    clean_note = sanitize_text(payload.note, max_length=500)
    record_status(db, issue, user, payload.status, clean_note)
    db.commit(); db.refresh(issue)
    return to_issue_out(db, issue)

