from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from auth import current_user
from db import get_db
from models.entities import RedeemedPass, Report, RewardTransaction, User
from services.rewards import REWARDS_CATALOG, DAILY_REPORTING_CAP, get_today_reporting_points, redeem_reward
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class LeaderboardEntry(BaseModel):
    rank: int
    user_id: int
    name: str
    points: int
    badge_level: str
    reports_count: int

class RewardTxOut(BaseModel):
    id: int
    points: int
    reason: str
    issue_id: int | None
    created_at: datetime

    class Config:
        from_attributes = True

class RedeemedPassOut(BaseModel):
    id: int
    pass_code: str
    reward_type: str
    title: str
    subtitle: str
    points_spent: int
    transit_mode: str
    city: str
    barcode_num: str
    status: str
    expires_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True

class MyRewardsSummary(BaseModel):
    points: int
    badge_level: str
    daily_points_today: int
    daily_cap: int
    transactions: list[RewardTxOut]
    active_passes_count: int

class RedeemIn(BaseModel):
    reward_id: str
    transit_mode: str | None = None

@router.get("/catalog")
def get_catalog(user: User = Depends(current_user), db: Session = Depends(get_db)):
    today_earned = get_today_reporting_points(db, user.id)
    return {
        "catalog": REWARDS_CATALOG,
        "daily_cap": DAILY_REPORTING_CAP,
        "daily_earned_today": today_earned,
        "daily_remaining": max(0, DAILY_REPORTING_CAP - today_earned),
        "current_balance": user.points or 0,
        "badge_level": user.badge_level or "Bronze Scout"
    }

@router.post("/redeem", response_model=RedeemedPassOut)
def redeem_pass(payload: RedeemIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role != "citizen":
        raise HTTPException(403, "Rewards redemption is available for citizen accounts")
    try:
        pass_obj = redeem_reward(db, user, payload.reward_id, transit_mode_override=payload.transit_mode)
        return RedeemedPassOut.model_validate(pass_obj)
    except ValueError as exc:
        raise HTTPException(400, str(exc))

@router.get("/my-passes", response_model=list[RedeemedPassOut])
def my_passes(user: User = Depends(current_user), db: Session = Depends(get_db)):
    passes = db.query(RedeemedPass).filter(RedeemedPass.user_id == user.id).order_by(RedeemedPass.created_at.desc()).all()
    return [RedeemedPassOut.model_validate(p) for p in passes]

@router.get("/leaderboard", response_model=list[LeaderboardEntry])
def get_leaderboard(db: Session = Depends(get_db)):
    citizens = db.query(User).filter(User.role == "citizen").order_by(User.points.desc()).limit(20).all()
    results = []
    for idx, c in enumerate(citizens, start=1):
        rep_count = db.query(Report).filter(Report.reporter_id == c.id).count()
        results.append(LeaderboardEntry(
            rank=idx,
            user_id=c.id,
            name=c.full_name,
            points=c.points or 0,
            badge_level=c.badge_level or "Bronze Scout",
            reports_count=rep_count,
        ))
    return results

@router.get("/my-history", response_model=MyRewardsSummary)
def my_rewards_history(user: User = Depends(current_user), db: Session = Depends(get_db)):
    txs = db.query(RewardTransaction).filter(RewardTransaction.user_id == user.id).order_by(RewardTransaction.created_at.desc()).all()
    today_earned = get_today_reporting_points(db, user.id)
    passes_count = db.query(RedeemedPass).filter(RedeemedPass.user_id == user.id, RedeemedPass.status == "active").count()
    return MyRewardsSummary(
        points=user.points or 0,
        badge_level=user.badge_level or "Bronze Scout",
        daily_points_today=today_earned,
        daily_cap=DAILY_REPORTING_CAP,
        transactions=[RewardTxOut.model_validate(t) for t in txs],
        active_passes_count=passes_count
    )
