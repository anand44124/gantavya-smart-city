from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from auth import current_user
from db import get_db
from models.entities import Assignment, Issue, User, now
from services.issues import record_status, to_issue_out
from services.sla import evaluate

router = APIRouter()

class AssignmentIn(BaseModel):
    worker_id: int

from services.issues import record_status, to_issue_out, RESOLVED_STATUSES, OPEN_STATUSES

@router.get("/summary")
def summary(user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, int]:
    if user.role != "admin":
        raise HTTPException(403, "Admin access required")
    issues = db.query(Issue).all()
    return {
        "total_issues": len(issues),
        "open": sum(issue.status not in (RESOLVED_STATUSES | {"rejected"}) for issue in issues),
        "high_priority": sum(issue.priority == "high" for issue in issues),
        "resolved": sum(issue.status in RESOLVED_STATUSES for issue in issues)
    }

@router.post("/issues/{issue_id}/assign")
def assign_worker(issue_id: int, payload: AssignmentIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role != "admin":
        raise HTTPException(403, "Admin access required")
    issue = db.get(Issue, issue_id)
    worker = db.get(User, payload.worker_id)
    if not issue:
        raise HTTPException(404, "Issue not found")
    if not worker or worker.role != "worker":
        raise HTTPException(422, "A field worker account is required")
    for previous in db.query(Assignment).filter(Assignment.issue_id == issue_id, Assignment.status != "completed").all():
        previous.status = "reassigned"
    db.add(Assignment(issue_id=issue_id, worker_id=worker.id, status="assigned", assigned_at=now()))
    record_status(db, issue, user, "assigned", f"Assigned to {worker.full_name}")
    db.commit(); db.refresh(issue)
    return to_issue_out(db, issue)

@router.get("/analytics")
def analytics(user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role != "admin":
        raise HTTPException(403, "Admin access required")
    issues = db.query(Issue).all()
    by_category: dict[str, int] = {}; by_department: dict[str, int] = {}; by_status: dict[str, int] = {}
    for issue in issues:
        by_category[issue.category] = by_category.get(issue.category, 0) + 1
        by_department[issue.department] = by_department.get(issue.department, 0) + 1
        by_status[issue.status] = by_status.get(issue.status, 0) + 1
    sla = [evaluate(issue) for issue in issues]
    return {
        "total": len(issues),
        "open": sum(issue.status not in (RESOLVED_STATUSES | {"rejected"}) for issue in issues),
        "resolved": sum(issue.status in RESOLVED_STATUSES for issue in issues),
        "high_priority": sum(issue.priority == "high" for issue in issues),
        "sla_breaches": sum(item["overdue"] for item in sla),
        "recurring": sum(issue.is_recurring for issue in issues),
        "by_category": by_category,
        "by_department": by_department,
        "by_status": by_status
    }

@router.get("/sla")
def sla(days: int = 0, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role != "admin":
        raise HTTPException(403, "Admin access required")
    return {"simulated_days": days, "issues": [evaluate(issue, days) for issue in db.query(Issue).order_by(Issue.updated_at.desc()).all()]}

import math
from datetime import datetime, timezone, timedelta

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

@router.get("/locality-analytics")
def locality_analytics(
    query: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
    radius_km: float = 5.0,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    if user.role != "admin":
        raise HTTPException(403, "Admin access required")

    from models.entities import Report

    all_reports = db.query(Report).order_by(Report.created_at.desc()).all()
    all_issues = db.query(Issue).order_by(Issue.created_at.desc()).all()

    # Filter reports by coordinates & radius OR by text query
    matched_reports = []
    for r in all_reports:
        if lat is not None and lng is not None:
            dist = haversine_km(lat, lng, r.latitude, r.longitude)
            if dist <= radius_km:
                matched_reports.append(r)
        elif query and query.strip():
            q = query.strip().lower()
            if (q in r.title.lower() or 
                (r.description and q in r.description.lower()) or 
                q in r.reference_code.lower()):
                matched_reports.append(r)
        else:
            matched_reports.append(r)

    # Correlate issues
    matched_issue_ids = {r.issue_id for r in matched_reports if r.issue_id}
    matched_issues = []
    for i in all_issues:
        if (lat is not None and lng is not None):
            dist = haversine_km(lat, lng, i.latitude, i.longitude)
            if dist <= radius_km or i.id in matched_issue_ids:
                matched_issues.append(i)
        elif query and query.strip():
            q = query.strip().lower()
            if (i.id in matched_issue_ids or 
                q in i.title.lower() or 
                q in i.department.lower() or 
                q in i.category.lower()):
                matched_issues.append(i)
        else:
            matched_issues.append(i)

    # Unique issues
    seen_ids = set()
    unique_issues = []
    for i in matched_issues:
        if i.id not in seen_ids:
            seen_ids.add(i.id)
            unique_issues.append(i)

    total_complaints = len(matched_reports) if (lat is not None or (query and query.strip())) else len(all_reports)
    total_issues = len(unique_issues)

    resolved_count = sum(1 for i in unique_issues if i.status in ("resolved", "verified_closed", "completed"))
    in_progress_count = sum(1 for i in unique_issues if i.status in ("in_progress", "assigned", "acknowledged"))
    pending_count = sum(1 for i in unique_issues if i.status in ("reported", "open", "submitted"))

    resolution_rate = round((resolved_count / total_issues * 100.0), 1) if total_issues > 0 else 0.0

    by_category: dict[str, int] = {}
    by_department: dict[str, int] = {}
    by_status: dict[str, int] = {}
    by_priority: dict[str, int] = {"high": 0, "medium": 0, "low": 0}

    for i in unique_issues:
        by_category[i.category] = by_category.get(i.category, 0) + 1
        by_department[i.department] = by_department.get(i.department, 0) + 1
        by_status[i.status] = by_status.get(i.status, 0) + 1
        by_priority[i.priority] = by_priority.get(i.priority, 0) + 1

    # Timeline buckets (Monthly/Weekly trend of complaints received vs resolved)
    now_utc = datetime.now(timezone.utc)
    timeline = []
    # Last 6 periods of 7 days each
    for idx in range(5, -1, -1):
        period_start = now_utc - timedelta(days=(idx + 1) * 7)
        period_end = now_utc - timedelta(days=idx * 7)
        period_label = f"Week -{idx}" if idx > 0 else "This Week"

        complaints_in_period = sum(1 for r in matched_reports if r.created_at and period_start <= (r.created_at if r.created_at.tzinfo else r.created_at.replace(tzinfo=timezone.utc)) < period_end)
        resolved_in_period = sum(1 for i in unique_issues if i.status in ("resolved", "verified_closed") and i.updated_at and period_start <= (i.updated_at if i.updated_at.tzinfo else i.updated_at.replace(tzinfo=timezone.utc)) < period_end)

        timeline.append({
            "period": period_label,
            "complaints": complaints_in_period,
            "resolved": resolved_in_period,
        })

    # Prepare geo-issue list for map markers
    map_issues = [
        {
            "id": i.id,
            "title": i.title,
            "category": i.category,
            "subtype": i.subtype,
            "department": i.department,
            "status": i.status,
            "priority": i.priority,
            "latitude": i.latitude,
            "longitude": i.longitude,
            "report_count": i.report_count,
            "created_at": i.created_at.isoformat() if i.created_at else None,
        }
        for i in unique_issues
    ]

    return {
        "locality_query": query,
        "center_lat": lat,
        "center_lng": lng,
        "radius_km": radius_km,
        "total_complaints": total_complaints,
        "total_issues": total_issues,
        "resolved_count": resolved_count,
        "in_progress_count": in_progress_count,
        "pending_count": pending_count,
        "resolution_rate": resolution_rate,
        "by_category": by_category,
        "by_department": by_department,
        "by_status": by_status,
        "by_priority": by_priority,
        "timeline": timeline,
        "issues": map_issues,
    }

