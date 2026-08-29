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

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "civicpulse-api"}
