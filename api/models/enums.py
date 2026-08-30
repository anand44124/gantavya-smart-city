from enum import StrEnum

class UserRole(StrEnum):
    citizen = "citizen"
    admin = "admin"
    worker = "worker"

class IssueStatus(StrEnum):
    reported = "reported"
    acknowledged = "acknowledged"
    assigned = "assigned"
    in_progress = "in_progress"
    completed = "completed"
    verified = "verified"
    resolved = "resolved"
    rejected = "rejected"
