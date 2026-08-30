from datetime import datetime, timezone, timedelta
import random
from sqlalchemy.orm import Session
from models.entities import RewardTransaction, User, RedeemedPass, now

BADGE_TIERS = [
    (3000, "Diamond Reformer"),
    (2000, "Platinum City Guardian"),
    (1000, "Gold Civic Champion"),
    (500, "Silver Vigilante"),
    (0, "Bronze Scout"),
]

DAILY_REPORTING_CAP = 100

REWARDS_CATALOG = [
    {
        "id": "metro_day_pass",
        "title": "1-Day Unlimited Metro Transit Pass",
        "subtitle": "Unlimited travel on all Metro lines (Blue, Yellow, Red, Magenta, Aqua)",
        "points_cost": 1000,
        "transit_mode": "metro",
        "category": "transit",
        "icon": "🚇",
        "validity_hours": 24,
    },
    {
        "id": "bus_day_pass",
        "title": "1-Day Unlimited Govt / Electric Bus Pass",
        "subtitle": "Valid on all City Electric AC/Non-AC & State Transport Govt Buses",
        "points_cost": 1000,
        "transit_mode": "bus",
        "category": "transit",
        "icon": "🚌",
        "validity_hours": 24,
    },
    {
        "id": "metro_bus_weekly",
        "title": "7-Day Metropolitan Transit Pass",
        "subtitle": "All-access weekly pass for Metro Rail + City Electric Bus network",
        "points_cost": 2500,
        "transit_mode": "metro",
        "category": "transit",
        "icon": "🎫",
        "validity_hours": 168,
    },
    {
        "id": "tax_rebate_500",
        "title": "Municipal Property Tax ₹500 Rebate",
        "subtitle": "Direct rebate credit voucher for Nagar Nigam Griha Kar",
        "points_cost": 3000,
        "transit_mode": "utility",
        "category": "utility",
        "icon": "🏛️",
        "validity_hours": 720,
    },
    {
        "id": "ev_charge_20kwh",
        "title": "EV Fast Charging 20 kWh Credit",
        "subtitle": "Free kWh credits at municipal smart city EV charging hubs",
        "points_cost": 1800,
        "transit_mode": "utility",
        "category": "green",
        "icon": "⚡",
        "validity_hours": 360,
    },
]

def calculate_badge(points: int) -> str:
    for threshold, badge in BADGE_TIERS:
        if points >= threshold:
            return badge
    return "Bronze Scout"

def get_today_reporting_points(db: Session, user_id: int) -> int:
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    txs = db.query(RewardTransaction).filter(
        RewardTransaction.user_id == user_id,
        RewardTransaction.points > 0,
        RewardTransaction.created_at >= today_start
    ).all()
    # sum points for daily reporting
    return sum(t.points for t in txs if "report" in t.reason.lower() or "submission" in t.reason.lower())

def award_points(db: Session, user: User, points: int, reason: str, issue_id: int | None = None, is_reporting: bool = False) -> RewardTransaction | None:
    if points <= 0:
        return None

    actual_points = points
    if is_reporting:
        today_earned = get_today_reporting_points(db, user.id)
        if today_earned >= DAILY_REPORTING_CAP:
            return None  # Daily cap reached
        actual_points = min(points, DAILY_REPORTING_CAP - today_earned)

    if actual_points <= 0:
        return None

    user.points = (user.points or 0) + actual_points
    user.badge_level = calculate_badge(user.points)
    tx = RewardTransaction(user_id=user.id, points=actual_points, reason=reason, issue_id=issue_id)
    db.add(tx)
    db.flush()
    return tx

def redeem_reward(db: Session, user: User, reward_id: str, transit_mode_override: str | None = None) -> RedeemedPass:
    item = next((r for r in REWARDS_CATALOG if r["id"] == reward_id), None)
    if not item:
        raise ValueError("Invalid reward item selected.")

    points_cost = item["points_cost"]
    current_points = user.points or 0
    if current_points < points_cost:
        raise ValueError(f"Insufficient Civic Points. You have {current_points} pts, but {points_cost} pts are required.")

    # Deduct points from citizen
    user.points = current_points - points_cost
    user.badge_level = calculate_badge(user.points)

    # Record deduction in transaction ledger
    tx = RewardTransaction(
        user_id=user.id,
        points=-points_cost,
        reason=f"Redeemed: {item['title']}",
        issue_id=None
    )
    db.add(tx)

    # Generate scannable pass credentials
    mode = transit_mode_override or item["transit_mode"]
    prefix = "METRO" if mode == "metro" else "BUS" if mode == "bus" else "CIVIC"
    random_digits = "".join(random.choices("0123456789", k=8))
    pass_code = f"{prefix}-{random_digits}"
    barcode_num = f"{random.randint(10, 99)} {random.randint(1000000, 9999999)} {random.randint(100000, 999999)}"
    
    expires_at = datetime.now(timezone.utc) + timedelta(hours=item["validity_hours"])

    pass_obj = RedeemedPass(
        user_id=user.id,
        pass_code=pass_code,
        reward_type=item["id"],
        title=item["title"],
        subtitle=item["subtitle"],
        points_spent=points_cost,
        transit_mode=mode,
        city="Metropolitan Smart City",
        barcode_num=barcode_num,
        status="active",
        expires_at=expires_at,
        created_at=now()
    )
    db.add(pass_obj)
    db.commit()
    db.refresh(pass_obj)
    return pass_obj
