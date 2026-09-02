import sys
import os
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

# Ensure database path is resolved properly in serverless environments
db_path = Path("/tmp/gantavya_resilient.db")
os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from api.routes import admin, auth, issues, reports, rewards, webhooks, workers
from config.settings import settings
from db import Base, engine, SessionLocal

app = FastAPI(title="Gantavya Cloud API", version="1.0.0")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(issues.router, prefix="/api/issues", tags=["issues"])
app.include_router(workers.router, prefix="/api/workers", tags=["workers"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(rewards.router, prefix="/api/rewards", tags=["rewards"])
app.include_router(webhooks.router, prefix="/api/webhooks", tags=["webhooks"])

Base.metadata.create_all(bind=engine)

try:
    from main import seed_demo_data
    seed_demo_data()
except Exception as e:
    print("[Serverless Seed Notice]", e)


