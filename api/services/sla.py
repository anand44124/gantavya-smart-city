from datetime import datetime, timedelta, timezone
from models.entities import Issue

SLA_DAYS = {"road_infrastructure": 7, "street_electrical": 3, "sanitation": 2, "water_drainage": 1, "public_safety": 3, "other": 7}

def as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)

def due_at(issue: Issue) -> datetime:
    return as_utc(issue.created_at) + timedelta(days=SLA_DAYS.get(issue.category, 7))

def evaluate(issue: Issue, simulated_days: int = 0) -> dict[str, object]:
    due = due_at(issue); now = datetime.now(timezone.utc) + timedelta(days=simulated_days)
    overdue = issue.status not in {"resolved", "rejected"} and now > due
    overdue_days = max(0, (now - due).days) if overdue else 0
    escalation = 2 if overdue_days >= 7 else 1 if overdue_days >= 1 else 0
    return {"issue_id": issue.id, "sla_days": SLA_DAYS.get(issue.category, 7), "sla_due_at": due, "simulated_now": now, "overdue": overdue, "overdue_days": overdue_days, "escalation_level": escalation, "escalation_label": ["Normal", "Ward Officer", "Senior Municipal Officer"][escalation]}
