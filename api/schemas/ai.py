from pydantic import BaseModel, Field

class AIClassification(BaseModel):
    is_civic_issue: bool
    is_pothole: bool = False
    category: str = "road_infrastructure"
    subtype: str = "pothole"
    department: str = "Roads Department"
    confidence: float = Field(default=0.9, ge=0, le=1)
    severity: int = Field(default=5, ge=0, le=10)
    hazards: list[str] = Field(default_factory=list)
    suggested_title: str = ""
    suggested_description: str = ""
    message: str = ""
    decision: str = "accept"
    reason: str | None = None

