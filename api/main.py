import logging
from pathlib import Path
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from api.routes import admin, auth, issues, reports, rewards, workers
from config.settings import settings
from db import Base, engine

logger = logging.getLogger("civicpulse")

app = FastAPI(title="CivicPulse API", version="0.1.0")

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    # Prevent caching sensitive auth responses
    if request.url.path.startswith("/api/auth"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"

    return response

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Retry-After"],
)

# Global Safe Exception Handler (Prevents stack traces leaking to client)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled server exception at %s: %s", request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again later."},
    )

app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(issues.router, prefix="/api/issues", tags=["issues"])
app.include_router(workers.router, prefix="/api/workers", tags=["workers"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(rewards.router, prefix="/api/rewards", tags=["rewards"])

Base.metadata.create_all(bind=engine)
if settings.database_url.startswith("sqlite"):
    with engine.begin() as connection:
        user_columns = {row[1] for row in connection.exec_driver_sql("PRAGMA table_info(users)")}
        if "points" not in user_columns:
            connection.exec_driver_sql("ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0")
        if "badge_level" not in user_columns:
            connection.exec_driver_sql("ALTER TABLE users ADD COLUMN badge_level VARCHAR(50) DEFAULT 'Bronze Scout'")
        if "avatar_url" not in user_columns:
            connection.exec_driver_sql("ALTER TABLE users ADD COLUMN avatar_url TEXT")

        columns = {row[1] for row in connection.exec_driver_sql("PRAGMA table_info(reports)")}
        if "issue_id" not in columns:
            connection.exec_driver_sql("ALTER TABLE reports ADD COLUMN issue_id INTEGER")
        if "video_path" not in columns:
            connection.exec_driver_sql("ALTER TABLE reports ADD COLUMN video_path VARCHAR(500)")
        if "evidence_base64" not in columns:
            connection.exec_driver_sql("ALTER TABLE reports ADD COLUMN evidence_base64 TEXT")

        issue_columns = {row[1] for row in connection.exec_driver_sql("PRAGMA table_info(issues_runtime)")}
        if "sla_due_at" not in issue_columns:
            connection.exec_driver_sql("ALTER TABLE issues_runtime ADD COLUMN sla_due_at DATETIME")
        if "escalation_level" not in issue_columns:
            connection.exec_driver_sql("ALTER TABLE issues_runtime ADD COLUMN escalation_level INTEGER DEFAULT 0")
        if "is_recurring" not in issue_columns:
            connection.exec_driver_sql("ALTER TABLE issues_runtime ADD COLUMN is_recurring BOOLEAN DEFAULT 0")

        evidence_columns = {row[1] for row in connection.exec_driver_sql("PRAGMA table_info(repair_evidence)")}
        if "notes" not in evidence_columns:
            connection.exec_driver_sql("ALTER TABLE repair_evidence ADD COLUMN notes TEXT")
        if "video_path" not in evidence_columns:
            connection.exec_driver_sql("ALTER TABLE repair_evidence ADD COLUMN video_path VARCHAR(500)")

Path("./uploads").mkdir(exist_ok=True)

def seed_demo_data():
    from db import SessionLocal, Base, engine
    from auth import hash_password
    from models.entities import User
    try:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        citizens_data = [
            ("Demo Citizen 1", "citizen1@civicpulse.demo", "Citizen@123", 50000, "Diamond Reformer", "avatar_1"),
            ("Priya Sharma", "citizen2@civicpulse.demo", "Citizen@123", 32450, "Platinum Champion", "avatar_2"),
            ("Rahul Verma", "citizen3@civicpulse.demo", "Citizen@123", 18200, "Gold Crusader", "avatar_3"),
        ]
        for name, email, pwd, pts, badge, av in citizens_data:
            u = db.query(User).filter(User.email == email).first()
            if not u:
                u = User(full_name=name, email=email, password_hash=hash_password(pwd), role="citizen", points=pts, badge_level=badge, avatar_url=av)
                db.add(u)
            else:
                u.points = pts
                u.badge_level = badge
            db.commit()

        admin = db.query(User).filter(User.email == "admin@civicpulse.demo").first()
        if not admin:
            admin = User(full_name="CivicPulse Admin", email="admin@civicpulse.demo", password_hash=hash_password("Admin@123"), role="admin", points=0, badge_level="Bronze Scout", avatar_url="avatar_3")
            db.add(admin)
            db.commit()

        worker = db.query(User).filter(User.email == "worker1@civicpulse.demo").first()
        if not worker:
            worker = User(full_name="Arjun Kumar", email="worker1@civicpulse.demo", password_hash=hash_password("Worker@123"), role="worker", points=0, badge_level="Bronze Scout", avatar_url="avatar_4")
            db.add(worker)
            db.commit()

        print("Clean demo users ready with 50,000 Points!")
    except Exception as e:
        print("[Seed Notice]", e)
    finally:
        try:
            db.close()
        except Exception:
            pass

seed_demo_data()

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "civicpulse-api"}
