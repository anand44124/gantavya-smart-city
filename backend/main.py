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
    from models.entities import User, Report, Issue, Assignment, RepairEvidence, CommunityVerification
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 1. Seed Multiple Citizens for Leaderboard & Community
        citizens_data = [
            ("Demo Citizen 1", "citizen1@civicpulse.demo", "Citizen@123", 50000, "Diamond Reformer", "avatar_1"),
            ("Priya Sharma", "citizen2@civicpulse.demo", "Citizen@123", 32450, "Platinum Champion", "avatar_2"),
            ("Rahul Verma", "citizen3@civicpulse.demo", "Citizen@123", 18200, "Gold Crusader", "avatar_3"),
            ("Ananya Patel", "citizen4@civicpulse.demo", "Citizen@123", 8500, "Gold Crusader", "avatar_4"),
            ("Amit Singh", "citizen5@civicpulse.demo", "Citizen@123", 4200, "Silver Guardian", "avatar_5"),
        ]
        citizen_users = []
        for name, email, pwd, pts, badge, av in citizens_data:
            u = db.query(User).filter(User.email == email).first()
            if not u:
                u = User(full_name=name, email=email, password_hash=hash_password(pwd), role="citizen", points=pts, badge_level=badge, avatar_url=av)
                db.add(u)
                db.commit()
                db.refresh(u)
            else:
                u.points = pts
                u.badge_level = badge
                db.commit()
            citizen_users.append(u)

        demo_citizen = citizen_users[0]

        # 2. Seed Admin
        demo_admin = db.query(User).filter(User.email == "admin@civicpulse.demo").first()
        if not demo_admin:
            demo_admin = User(full_name="CivicPulse Admin", email="admin@civicpulse.demo", password_hash=hash_password("Admin@123"), role="admin", points=0, badge_level="Bronze Scout", avatar_url="avatar_3")
            db.add(demo_admin)
            db.commit()

        # 3. Seed Workers
        workers_data = [
            ("Arjun Kumar", "worker1@civicpulse.demo", "Worker@123", "avatar_4"),
            ("Meera Shah", "worker2@civicpulse.demo", "Worker@123", "avatar_5"),
        ]
        workers = []
        for name, email, pwd, av in workers_data:
            w = db.query(User).filter(User.email == email).first()
            if not w:
                w = User(full_name=name, email=email, password_hash=hash_password(pwd), role="worker", points=0, badge_level="Bronze Scout", avatar_url=av)
                db.add(w)
                db.commit()
                db.refresh(w)
            workers.append(w)
        demo_worker = workers[0]
        demo_worker_2 = workers[1]

        # 4. Seed Rich Demo Issues & Reports
        if db.query(Report).count() <= 2:
            db.query(Report).delete()
            db.query(Issue).delete()
            db.query(Assignment).delete()
            db.query(RepairEvidence).delete()
            db.query(CommunityVerification).delete()
            db.commit()

            demo_b64 = ""
            b64_file = Path(__file__).parent / "default_demo_image.b64"
            if b64_file.exists():
                demo_b64 = b64_file.read_text().strip()

            # ISSUE 1: Large Water-Filled Pothole on Road (RESOLVED - Subah wala CP-E53338)
            issue1 = Issue(
                title="Large Water-Filled Pothole on Road",
                category="road_infrastructure",
                subtype="pothole",
                department="Roads Department",
                status="resolved",
                priority="high",
                priority_score=8.5,
                latitude=26.27110,
                longitude=78.22790,
                report_count=1,
                is_recurring=False,
            )
            db.add(issue1); db.flush()

            report1 = Report(
                reference_code="CP-E53338",
                reporter_id=demo_citizen.id,
                issue_id=issue1.id,
                title="Large Water-Filled Pothole on Road",
                description="Deep and dangerous asphalt depression filled with water on the road. High risk for vehicles and two-wheelers.",
                evidence_path="demo_pothole_report.jpg",
                evidence_base64=demo_b64 or None,
                latitude=26.27110,
                longitude=78.22790,
                status="resolved",
            )
            db.add(report1)
            db.add(Assignment(issue_id=issue1.id, worker_id=demo_worker.id, status="completed"))
            db.add(RepairEvidence(
                issue_id=issue1.id,
                worker_id=demo_worker.id,
                kind="photo",
                path="demo_pothole_resolved.jpg",
                notes="Hot-mix bitumen applied, compacted with heavy roller, and road leveled. Traffic lane reopened.",
            ))
            for c in citizen_users[1:4]:
                db.add(CommunityVerification(issue_id=issue1.id, citizen_id=c.id, result="fixed"))

            # ISSUE 2: Damaged Stormwater Drain on Ring Road (DUPLICATE CLUSTER - Subah wala CP-619D06 & CP-03DF9F)
            issue2 = Issue(
                title="Damaged Stormwater Drain on Ring Road",
                category="road_infrastructure",
                subtype="drainage_damage",
                department="Roads Department",
                status="reported",
                priority="medium",
                priority_score=6.5,
                latitude=28.61390,
                longitude=77.20900,
                report_count=2,
                is_recurring=False,
            )
            db.add(issue2); db.flush()

            db.add(Report(
                reference_code="CP-619D06",
                reporter_id=demo_citizen.id,
                issue_id=issue2.id,
                title="Damaged Stormwater Drain on Ring Road",
                description="Broken concrete slab on the stormwater drainage along Ring Road creating deep pedestrian hazard.",
                evidence_path="demo_drain_report.jpg",
                evidence_base64=demo_b64 or None,
                latitude=28.61390,
                longitude=77.20900,
                status="reported",
            ))

            db.add(Report(
                reference_code="CP-03DF9F",
                reporter_id=citizen_users[1].id,
                issue_id=issue2.id,
                title="Collapsed Drain Grate on Ring Road Footpath",
                description="Concrete drain opening collapsed near bus stand, needs immediate replacement slab.",
                evidence_path="demo_drain_report.jpg",
                evidence_base64=demo_b64 or None,
                latitude=28.61400,
                longitude=77.20910,
                status="reported",
            ))

            # ISSUE 3: Massive Uncollected Garbage Dump (RESOLVED - Subah wala CP-CBA0D4)
            issue3 = Issue(
                title="Massive Uncollected Garbage Dump on Roadside",
                category="sanitation",
                subtype="garbage_overflow",
                department="Sanitation Department",
                status="resolved",
                priority="high",
                priority_score=8.0,
                latitude=26.22450,
                longitude=78.17500,
                report_count=1,
                is_recurring=False,
            )
            db.add(issue3); db.flush()

            db.add(Report(
                reference_code="CP-CBA0D4",
                reporter_id=demo_citizen.id,
                issue_id=issue3.id,
                title="Massive Uncollected Garbage Dump on Roadside",
                description="Large uncollected pile of municipal waste overflowing on roadside near Phoolbagh Chowk.",
                evidence_path="demo_garbage_report.jpg",
                evidence_base64=demo_b64 or None,
                latitude=26.22450,
                longitude=78.17500,
                status="resolved",
            ))
            db.add(Assignment(issue_id=issue3.id, worker_id=demo_worker.id, status="completed"))
            db.add(RepairEvidence(
                issue_id=issue3.id,
                worker_id=demo_worker.id,
                kind="photo",
                path="demo_garbage_resolved.jpg",
                notes="Municipal compactor truck deployed, 1.8 tonnes of solid waste cleared and area bleached.",
            ))

            # ISSUE 4: Massive Uncollected Garbage Heap (CITIZEN VERIFIED CLOSED - Subah wala CP-DB6449)
            issue4 = Issue(
                title="Massive Uncollected Garbage Heap on Roadside",
                category="sanitation",
                subtype="garbage_overflow",
                department="Sanitation Department",
                status="verified_closed",
                priority="high",
                priority_score=7.8,
                latitude=26.22450,
                longitude=78.17500,
                report_count=1,
                is_recurring=False,
            )
            db.add(issue4); db.flush()

            db.add(Report(
                reference_code="CP-DB6449",
                reporter_id=demo_citizen.id,
                issue_id=issue4.id,
                title="Massive Uncollected Garbage Heap on Roadside",
                description="Solid waste accumulation causing severe odor. Verified cleared by citizen inspection.",
                evidence_path="demo_garbage_report.jpg",
                evidence_base64=demo_b64 or None,
                latitude=26.22450,
                longitude=78.17500,
                status="verified_closed",
            ))
            db.add(Assignment(issue_id=issue4.id, worker_id=demo_worker_2.id, status="completed"))
            db.add(RepairEvidence(
                issue_id=issue4.id,
                worker_id=demo_worker_2.id,
                kind="photo",
                path="demo_garbage_resolved.jpg",
                notes="Sanitation crew cleaned the spot and placed 2 new closed-lid waste bins.",
            ))
            db.add(CommunityVerification(issue_id=issue4.id, citizen_id=demo_citizen.id, result="fixed"))

            # ISSUE 5: Large Deep Pothole on Asphalt Road (CITIZEN VERIFIED CLOSED - Subah wala CP-A32260)
            issue5 = Issue(
                title="Large Deep Pothole on Asphalt Road",
                category="road_infrastructure",
                subtype="pothole",
                department="Roads Department",
                status="verified_closed",
                priority="high",
                priority_score=8.2,
                latitude=26.21830,
                longitude=78.18280,
                report_count=1,
                is_recurring=False,
            )
            db.add(issue5); db.flush()

            db.add(Report(
                reference_code="CP-A32260",
                reporter_id=demo_citizen.id,
                issue_id=issue5.id,
                title="Large Deep Pothole on Asphalt Road",
                description="Deep cavity in the middle of the road. Repaired and verified closed by citizen.",
                evidence_path="demo_pothole_report.jpg",
                evidence_base64=demo_b64 or None,
                latitude=26.21830,
                longitude=78.18280,
                status="verified_closed",
            ))
            db.add(Assignment(issue_id=issue5.id, worker_id=demo_worker.id, status="completed"))
            db.add(RepairEvidence(
                issue_id=issue5.id,
                worker_id=demo_worker.id,
                kind="photo",
                path="demo_pothole_resolved.jpg",
                notes="Surface leveled with tar and asphalt roller.",
            ))
            db.add(CommunityVerification(issue_id=issue5.id, citizen_id=demo_citizen.id, result="fixed"))

            # ISSUE 6: Hazardous Deep Pothole near City Center (IN PROGRESS FOR WORKER DEMO - Subah wala CP-A08A0B)
            issue6 = Issue(
                title="Hazardous Deep Pothole near City Center Circle",
                category="road_infrastructure",
                subtype="pothole",
                department="Roads Department",
                status="in_progress",
                priority="high",
                priority_score=9.0,
                latitude=26.21830,
                longitude=78.18280,
                report_count=1,
                is_recurring=False,
            )
            db.add(issue6); db.flush()

            db.add(Report(
                reference_code="CP-A08A0B",
                reporter_id=demo_citizen.id,
                issue_id=issue6.id,
                title="Hazardous Deep Pothole near City Center Circle",
                description="Deep asphalt depression near the traffic light causing two-wheelers to lose balance.",
                evidence_path="demo_pothole_report.jpg",
                evidence_base64=demo_b64 or None,
                latitude=26.21830,
                longitude=78.18280,
                status="in_progress",
            ))
            db.add(Assignment(issue_id=issue6.id, worker_id=demo_worker.id, status="in_progress"))

            # ISSUE 7: Overflowing Public Waste Bin at Market (REPORTED FOR ADMIN DISPATCH DEMO - Subah wala CP-6C2695)
            issue7 = Issue(
                title="Overflowing Public Waste Bin at Market",
                category="sanitation",
                subtype="garbage_overflow",
                department="Sanitation Department",
                status="reported",
                priority="medium",
                priority_score=6.0,
                latitude=26.21500,
                longitude=78.18800,
                report_count=1,
                is_recurring=False,
            )
            db.add(issue7); db.flush()

            db.add(Report(
                reference_code="CP-6C2695",
                reporter_id=citizen_users[1].id,
                issue_id=issue7.id,
                title="Overflowing Public Waste Bin at Market",
                description="Street dustbin completely filled and overflowing onto sidewalk.",
                evidence_path="demo_garbage_report.jpg",
                evidence_base64=demo_b64 or None,
                latitude=26.21500,
                longitude=78.18800,
                status="reported",
            ))

            db.commit()
            print("Successfully restored all authentic subah wala database reports and issues!")
    except Exception as e:
        print("[Startup Seed Notice]", e)
        db.rollback()
    finally:
        db.close()

seed_demo_data()

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "civicpulse-api"}
