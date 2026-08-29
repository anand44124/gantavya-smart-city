from pydantic import BaseModel

class WorkerOut(BaseModel):
    id: int
    name: str
    assigned_issue_count: int
