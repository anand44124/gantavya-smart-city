from math import asin, cos, radians, sin, sqrt
from sqlalchemy.orm import Session
from models.entities import Assignment, CommunityVerification, Issue, RepairEvidence, Report, StatusEvent, User, now
from schemas.issue import IssueOut, ResolutionProofOut
from services.sla import due_at

DEPARTMENTS = {"road_infrastructure": "Roads Department", "street_electrical": "Electrical Department", "sanitation": "Sanitation Department", "water_drainage": "Water Department", "public_safety": "Public Safety Department", "other": "Municipal Services"}

def metres_between(first_lat: float, first_lng: float, second_lat: float, second_lng: float) -> float:
    latitude_delta, longitude_delta = radians(second_lat - first_lat), radians(second_lng - first_lng)
    value = sin(latitude_delta / 2) ** 2 + cos(radians(first_lat)) * cos(radians(second_lat)) * sin(longitude_delta / 2) ** 2
    return 6371000 * 2 * asin(sqrt(value))

def create_or_join_issue(db: Session, report: Report, category: str = "road_infrastructure", subtype: str = "pothole") -> Issue:
    radius = {"street_electrical": 20, "water_drainage": 40, "sanitation": 50}.get(category, 30)
    candidates = db.query(Issue).filter(Issue.category == category, Issue.status.not_in(["resolved", "verified_closed", "rejected"])).all()
    issue = next((candidate for candidate in candidates if metres_between(report.latitude, report.longitude, candidate.latitude, candidate.longitude) <= radius), None)
    if issue is None:
        issue = Issue(category=category, subtype=subtype, title=report.title, latitude=report.latitude, longitude=report.longitude, department=DEPARTMENTS.get(category, DEPARTMENTS["other"]), report_count=0)
        db.add(issue); db.flush()
        issue.sla_due_at = due_at(issue)
        previous_status = None
    else:
        previous_status = issue.status
    issue.report_count += 1
    issue.priority_score = min(100, 35 + min(20, 6 * issue.report_count) + min(20, issue.report_count * 2))
    issue.priority = "high" if issue.priority_score >= 70 else "medium" if issue.priority_score >= 45 else "low"
    issue.updated_at = now()
    report.issue_id = issue.id
    db.add(StatusEvent(issue_id=issue.id, actor_id=report.reporter_id, from_status=previous_status, to_status=issue.status, note="Report linked to physical issue"))
    return issue

def active_assignment(db: Session, issue_id: int) -> Assignment | None:
    return db.query(Assignment).filter(Assignment.issue_id == issue_id, Assignment.status != "completed").order_by(Assignment.assigned_at.desc()).first()

def worker_can_access(db: Session, user: User, issue_id: int) -> bool:
    return db.query(Assignment).filter(Assignment.issue_id == issue_id, Assignment.worker_id == user.id).first() is not None

def can_view_issue(db: Session, user: User, issue: Issue) -> bool:
    if user.role in {"admin", "citizen"}:
        return True
    return worker_can_access(db, user, issue.id)

def can_view_report(db: Session, user: User, report: Report) -> bool:
    if user.role == "admin":
        return True
    if user.role == "citizen":
        return report.reporter_id == user.id or report.issue_id is not None
    return bool(report.issue_id and worker_can_access(db, user, report.issue_id))

def to_issue_out(db: Session, issue: Issue) -> IssueOut:
    assignment = active_assignment(db, issue.id)
    worker = db.get(User, assignment.worker_id) if assignment else None
    still_present = db.query(CommunityVerification).filter(CommunityVerification.issue_id == issue.id, CommunityVerification.result == "still_present").count()
    marked_fixed = db.query(CommunityVerification).filter(CommunityVerification.issue_id == issue.id, CommunityVerification.result == "fixed").count()
    
    evidences = db.query(RepairEvidence).filter(RepairEvidence.issue_id == issue.id).order_by(RepairEvidence.created_at.desc()).all()
    proofs = []
    for ev in evidences:
        w = db.get(User, ev.worker_id)
        proofs.append(ResolutionProofOut(
            id=ev.id,
            issue_id=ev.issue_id,
            worker_id=ev.worker_id,
            worker_name=w.full_name if w else "Field Worker",
            photo_url=f"/api/issues/evidence/{ev.id}/file",
            video_url=f"/api/issues/evidence/{ev.id}/video" if ev.video_path else None,
            notes=ev.notes,
            created_at=ev.created_at
        ))

    # Find primary report linked to this issue for initial citizen photo & description
    primary_report = db.query(Report).filter(Report.issue_id == issue.id).order_by(Report.created_at.asc()).first()
    evidence_url = f"/api/reports/{primary_report.id}/evidence" if (primary_report and primary_report.evidence_path) else None
    video_url = f"/api/reports/{primary_report.id}/video" if (primary_report and primary_report.video_path) else None
    description = primary_report.description if primary_report else None

    return IssueOut.model_validate(issue, from_attributes=True).model_copy(update={
        "assigned_worker_id": assignment.worker_id if assignment else None,
        "assigned_worker_name": worker.full_name if worker else None,
        "still_present": still_present,
        "marked_fixed": marked_fixed,
        "resolution_proofs": proofs,
        "evidence_url": evidence_url,
        "video_url": video_url,
        "description": description,
    })

RESOLVED_STATUSES = {"resolved", "verified_closed", "completed"}
OPEN_STATUSES = {"reported", "open", "submitted", "in_progress", "assigned", "acknowledged"}

def record_status(db: Session, issue: Issue, user: User, status: str, note: str | None = None) -> Issue:
    previous = issue.status
    issue.status = status
    issue.updated_at = now()
    db.add(StatusEvent(issue_id=issue.id, actor_id=user.id, from_status=previous, to_status=status, note=note))
    for report in db.query(Report).filter(Report.issue_id == issue.id).all():
        report.status = status
    if status in RESOLVED_STATUSES:
        for assignment in db.query(Assignment).filter(Assignment.issue_id == issue.id, Assignment.status != "completed").all():
            assignment.status = "completed"
            assignment.completed_at = now()
    return issue