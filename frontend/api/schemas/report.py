from pydantic import BaseModel
from datetime import datetime

class ReportOut(BaseModel):
    id: int
    reference_code: str
    title: str
    description: str | None = None
    status: str
    priority: str = "medium"
    department: str | None = None
    issue_id: int | None = None
    latitude: float
    longitude: float
    evidence_url: str | None = None
    video_url: str | None = None
    created_at: datetime
    model_config = {"from_attributes": True}
