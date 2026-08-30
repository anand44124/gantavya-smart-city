import os
import shutil
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from config.settings import settings

source_db = Path(__file__).resolve().parent / "civicpulse.db"
target_db = Path("/tmp/civicpulse.db")

# Ensure /tmp/uploads exists
Path("/tmp/uploads").mkdir(parents=True, exist_ok=True)

if not target_db.exists() and source_db.exists():
    try:
        shutil.copyfile(source_db, target_db)
    except Exception:
        pass

db_url = f"sqlite:///{target_db}" if target_db.parent.exists() else settings.database_url

engine = create_engine(db_url, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()