from datetime import datetime, timezone
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, Float, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from db import Base

def now() -> datetime:
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(160))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="citizen")
    avatar_url: Mapped[str | None] = mapped_column(Text(), nullable=True, default=None)
    points: Mapped[int] = mapped_column(Integer, default=0)
    badge_level: Mapped[str] = mapped_column(String(50), default="Bronze Scout")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    reports: Mapped[list["Report"]] = relationship(back_populates="reporter")

class Report(Base):
    __tablename__ = "reports"
    id: Mapped[int] = mapped_column(primary_key=True)
    reference_code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    reporter_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    issue_id: Mapped[int | None] = mapped_column(ForeignKey("issues_runtime.id"), index=True)
    title: Mapped[str] = mapped_column(String(240))
    description: Mapped[str | None] = mapped_column(Text())
    evidence_path: Mapped[str | None] = mapped_column(String(500))
    evidence_sha256: Mapped[str | None] = mapped_column(String(64), index=True)
    video_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    latitude: Mapped[float] = mapped_column()
    longitude: Mapped[float] = mapped_column()
    status: Mapped[str] = mapped_column(String(30), default="reported")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    reporter: Mapped[User] = relationship(back_populates="reports")

class Issue(Base):
    __tablename__ = "issues_runtime"
    id: Mapped[int] = mapped_column(primary_key=True)
    category: Mapped[str] = mapped_column(String(80), default="road_infrastructure")
    subtype: Mapped[str] = mapped_column(String(80), default="pothole")
    title: Mapped[str] = mapped_column(String(240))
    status: Mapped[str] = mapped_column(String(30), default="reported", index=True)
    priority: Mapped[str] = mapped_column(String(20), default="medium")
    priority_score: Mapped[float] = mapped_column(Float, default=0)
    latitude: Mapped[float] = mapped_column()
    longitude: Mapped[float] = mapped_column()
    report_count: Mapped[int] = mapped_column(Integer, default=0)
    department: Mapped[str] = mapped_column(String(120), default="Municipal Services")
    sla_due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    escalation_level: Mapped[int] = mapped_column(Integer, default=0)
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class Assignment(Base):
    __tablename__ = "assignments"
    id: Mapped[int] = mapped_column(primary_key=True)
    issue_id: Mapped[int] = mapped_column(ForeignKey("issues_runtime.id"), index=True)
    worker_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String(30), default="assigned")
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

class ProgressNote(Base):
    __tablename__ = "progress_notes"
    id: Mapped[int] = mapped_column(primary_key=True)
    issue_id: Mapped[int] = mapped_column(ForeignKey("issues_runtime.id"), index=True)
    worker_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    note: Mapped[str] = mapped_column(Text())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class RepairEvidence(Base):
    __tablename__ = "repair_evidence"
    id: Mapped[int] = mapped_column(primary_key=True)
    issue_id: Mapped[int] = mapped_column(ForeignKey("issues_runtime.id"), index=True)
    worker_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    kind: Mapped[str] = mapped_column(String(20), default="photo")
    path: Mapped[str] = mapped_column(String(500))
    video_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class CommunityVerification(Base):
    __tablename__ = "community_verifications"
    id: Mapped[int] = mapped_column(primary_key=True)
    issue_id: Mapped[int] = mapped_column(ForeignKey("issues_runtime.id"), index=True)
    citizen_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    result: Mapped[str] = mapped_column(String(30))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class StatusEvent(Base):
    __tablename__ = "status_events_runtime"
    id: Mapped[int] = mapped_column(primary_key=True)
    issue_id: Mapped[int] = mapped_column(ForeignKey("issues_runtime.id"), index=True)
    actor_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    from_status: Mapped[str | None] = mapped_column(String(30))
    to_status: Mapped[str] = mapped_column(String(30))
    note: Mapped[str | None] = mapped_column(Text())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class RewardTransaction(Base):
    __tablename__ = "reward_transactions"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    points: Mapped[int] = mapped_column(Integer)
    reason: Mapped[str] = mapped_column(String(200))
    issue_id: Mapped[int | None] = mapped_column(ForeignKey("issues_runtime.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class RedeemedPass(Base):
    __tablename__ = "redeemed_passes"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    pass_code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    reward_type: Mapped[str] = mapped_column(String(50), default="metro_pass")
    title: Mapped[str] = mapped_column(String(120))
    subtitle: Mapped[str] = mapped_column(String(200))
    points_spent: Mapped[int] = mapped_column(Integer)
    transit_mode: Mapped[str] = mapped_column(String(30), default="metro") # 'metro', 'bus', 'utility'
    city: Mapped[str] = mapped_column(String(100), default="Metropolitan Smart City")
    barcode_num: Mapped[str] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(30), default="active") # 'active', 'used', 'expired'
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)