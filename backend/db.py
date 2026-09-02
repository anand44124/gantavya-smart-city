import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from config.settings import settings

db_url = settings.database_url
if db_url.startswith("postgresql://") and "+psycopg" not in db_url:
    db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)
elif db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+psycopg://", 1)

def get_engine():
    try:
        connect_args = {"connect_timeout": 3} if "postgresql" in db_url else {"check_same_thread": False}
        eng = create_engine(db_url, connect_args=connect_args)
        with eng.connect() as conn:
            conn.execute(text("SELECT 1"))
        return eng
    except Exception as e:
        print(f"[DB Warning] Primary PostgreSQL unavailable ({e}). Activating resilient SQLite fallback...")
        sqlite_path = "/tmp/gantavya_resilient.db" if os.path.exists("/tmp") else "gantavya_resilient.db"
        fallback_url = f"sqlite:///{sqlite_path}"
        return create_engine(fallback_url, connect_args={"check_same_thread": False})

engine = get_engine()
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        from models.entities import Report, User
        if db.query(Report).count() == 0 or db.query(User).count() < 3:
            from main import seed_demo_data
            seed_demo_data()
    except Exception as e:
        print("[On-Demand Seed Notice]", e)
    try:
        yield db
    finally:
        db.close()