from pydantic import BaseModel
from datetime import datetime

class StatusChange(BaseModel):
    status: str
    note: str | None = None

class ResolutionProofOut(BaseModel):
    id: int
    issue_id: int
    worker_id: int
    worker_name: str | None = None
    photo_url: str
    video_url: str | None = None
    notes: str | None = None
    created_at: datetime
    model_config = {"from_attributes": True}

class IssueOut(BaseModel):
    id: int
    category: str
    subtype: str = "pothole"
    title: str = ""
    status: str
    report_count: int
    priority: str = "medium"
    priority_score: float = 0
    department: str = "Municipal Services"
    latitude: float = 0
    longitude: float = 0
    sla_due_at: datetime | None = None
    escalation_level: int = 0
    is_recurring: bool = False
    assigned_worker_id: int | None = None
    assigned_worker_name: str | None = None
    still_present: int = 0
    marked_fixed: int = 0
    resolution_proofs: list[ResolutionProofOut] = []
    created_at: datetime | None = None
    updated_at: datetime | None = None
    model_config = {"from_attributes": True}

class StatusEventOut(BaseModel):
    id: int
    issue_id: int
    from_status: str | None = None
    to_status: str
    note: str | None = None
    created_at: datetime
    model_config = {"from_attributes": True}

class VerifyIn(BaseModel):
    result: str

class CitizenConfirmIn(BaseModel):
    decision: str  # "accept" or "reject"
    feedback: str | None = None

