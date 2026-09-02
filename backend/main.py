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
    from db import SessionLocal
    from auth import hash_password
    from models.entities import User, Report, Issue, Assignment, RepairEvidence, CommunityVerification
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

            # CASE 1: PRE-RESOLVED POTHOLE WITH CITIZEN BEFORE PHOTO + WORKER AFTER PHOTO + COMMUNITY CONFIRMATION
            issue1 = Issue(
                title="Hazardous Deep Asphalt Pothole on Sector 9 Ring Road",
                category="road_infrastructure",
                subtype="pothole",
                department="Roads Department",
                status="resolved",
                priority="high",
                priority_score=8.5,
                latitude=26.21830,
                longitude=78.18280,
                report_count=1,
                is_recurring=False,
            )
            db.add(issue1); db.flush()

            report1 = Report(
                reference_code="CP-DMO001",
                reporter_id=demo_citizen.id,
                issue_id=issue1.id,
                title="Hazardous Deep Asphalt Pothole on Sector 9 Ring Road",
                description="Dangerous road depression filled with stagnant water causing vehicle skidding. High accident risk for two-wheelers.",
                evidence_path="demo_pothole_report.jpg",
                evidence_base64=demo_b64 or None,
                latitude=26.21830,
                longitude=78.18280,
                status="resolved",
            )
            db.add(report1)

            assignment1 = Assignment(
                issue_id=issue1.id,
                worker_id=demo_worker.id,
                status="completed",
            )
            db.add(assignment1)

            # Worker After Proof Photo & Note
            evidence1 = RepairEvidence(
                issue_id=issue1.id,
                worker_id=demo_worker.id,
                kind="photo",
                path="demo_pothole_resolved.jpg",
                notes="Hot-mix bitumen applied, compacted with heavy road roller, and asphalt surface leveled. Traffic restored smoothly.",
            )
            db.add(evidence1)

            # Community Marked Fixed
            for c in citizen_users[1:4]:
                db.add(CommunityVerification(issue_id=issue1.id, citizen_id=c.id, result="fixed"))

            # CASE 2: DUPLICATE REPORTS CLUSTER DEMO (3 CITIZENS REPORTED SAME SANITATION DUMP)
            issue2 = Issue(
                title="Massive Overflowing Waste Dump near Sector 4 Central Market",
                category="sanitation",
                subtype="garbage_overflow",
                department="Sanitation Department",
                status="in_progress",
                priority="high",
                priority_score=9.2,
                latitude=26.22450,
                longitude=78.17500,
                report_count=3,
                is_recurring=False,
            )
            db.add(issue2); db.flush()

            # Duplicate Report 1 (By Demo Citizen 1)
            db.add(Report(
                reference_code="CP-DMO002",
                reporter_id=demo_citizen.id,
                issue_id=issue2.id,
                title="Massive Overflowing Waste Dump near Sector 4 Central Market",
                description="Large uncollected pile of municipal solid waste blocking pedestrian walkway and creating severe foul odor.",
                evidence_path="demo_garbage_report.jpg",
                evidence_base64=demo_b64 or None,
                latitude=26.22450,
                longitude=78.17500,
                status="in_progress",
            ))

            # Duplicate Report 2 (By Priya Sharma - Clustered into same issue)
            db.add(Report(
                reference_code="CP-DMO003",
                reporter_id=citizen_users[1].id,
                issue_id=issue2.id,
                title="Commercial Garbage Overflow at Market North Gate",
                description="Plastic bags and rotting food waste spilling over green municipal bins near shop entrance.",
                evidence_path="demo_garbage_report.jpg",
                evidence_base64=demo_b64 or None,
                latitude=26.22460,
                longitude=78.17510,
                status="in_progress",
            ))

            # Duplicate Report 3 (By Rahul Verma - Clustered into same issue)
            db.add(Report(
                reference_code="CP-DMO004",
                reporter_id=citizen_users[2].id,
                issue_id=issue2.id,
                title="Unattended Waste Pile near Vegetable Stalls",
                description="Stray cattle gathering around rotting waste pile, causing traffic bottleneck.",
                evidence_path="demo_garbage_report.jpg",
                evidence_base64=demo_b64 or None,
                latitude=26.22440,
                longitude=78.17490,
                status="in_progress",
            ))

            assignment2 = Assignment(
                issue_id=issue2.id,
                worker_id=demo_worker.id,
                status="in_progress",
            )
            db.add(assignment2)

            # CASE 3: CITIZEN VERIFIED & CLOSED (WATER LEAKAGE)
            issue3 = Issue(
                title="Main Drinking Water Pipeline Rupture & Road Flooding",
                category="water_drainage",
                subtype="pipeline_burst",
                department="Water Department",
                status="verified_closed",
                priority="high",
                priority_score=8.0,
                latitude=26.22100,
                longitude=78.17900,
                report_count=1,
                is_recurring=False,
            )
            db.add(issue3); db.flush()

            db.add(Report(
                reference_code="CP-DMO005",
                reporter_id=demo_citizen.id,
                issue_id=issue3.id,
                title="Main Drinking Water Pipeline Rupture & Road Flooding",
                description="High pressure clean water overflowing on main avenue. Road submerged in 6 inches of water.",
                evidence_path="demo_water_report.jpg",
                evidence_base64=demo_b64 or None,
                latitude=26.22100,
                longitude=78.17900,
                status="verified_closed",
            ))

            db.add(Assignment(issue_id=issue3.id, worker_id=demo_worker_2.id, status="completed"))
            db.add(RepairEvidence(
                issue_id=issue3.id,
                worker_id=demo_worker_2.id,
                kind="photo",
                path="demo_water_resolved.jpg",
                notes="Cast-iron pipe fracture welded, new gate valve installed, and pressure stabilized at 3.5 bar.",
            ))
            db.add(CommunityVerification(issue_id=issue3.id, citizen_id=demo_citizen.id, result="fixed"))

            # CASE 4: UNASSIGNED OPEN INCIDENT (READY FOR ADMIN LIVE DISPATCH DEMO)
            issue4 = Issue(
                title="Non-Functional High-Mast Streetlight & Exposed Electrical Wiring",
                category="street_electrical",
                subtype="streetlight_broken",
                department="Electrical Department",
                status="reported",
                priority="medium",
                priority_score=6.0,
                latitude=26.21500,
                longitude=78.18800,
                report_count=1,
                is_recurring=False,
            )
            db.add(issue4); db.flush()

            db.add(Report(
                reference_code="CP-DMO006",
                reporter_id=citizen_users[1].id,
                issue_id=issue4.id,
                title="Non-Functional High-Mast Streetlight & Exposed Electrical Wiring",
                description="Dark stretch of road due to 4 damaged sodium lamps. Junction box cover missing with exposed 230V wires.",
                evidence_path="demo_streetlight_report.jpg",
                evidence_base64=demo_b64 or None,
                latitude=26.21500,
                longitude=78.18800,
                status="reported",
            ))

            # CASE 5: ACTIVE IN-PROGRESS TASK (READY FOR WORKER RESOLUTION LIVE DEMO)
            issue5 = Issue(
                title="Fallen Tree Trunk Blocking Highway Left Lane",
                category="road_infrastructure",
                subtype="fallen_tree",
                department="Roads Department",
                status="in_progress",
                priority="high",
                priority_score=8.8,
                latitude=26.21950,
                longitude=78.18100,
                report_count=1,
                is_recurring=False,
            )
            db.add(issue5); db.flush()

            db.add(Report(
                reference_code="CP-DMO007",
                reporter_id=demo_citizen.id,
                issue_id=issue5.id,
                title="Fallen Tree Trunk Blocking Highway Left Lane",
                description="Heavy branch snapped during rainstorm blocking vehicle passage. Immediate chainsaw clearing required.",
                evidence_path="demo_tree_report.jpg",
                evidence_base64=demo_b64 or None,
                latitude=26.21950,
                longitude=78.18100,
                status="in_progress",
            ))

            db.add(Assignment(issue_id=issue5.id, worker_id=demo_worker.id, status="in_progress"))

            db.commit()
            print("Successfully seeded full comprehensive dataset (Resolved with Before/After, Duplicate Grouping, Citizen Verified, and Live Dispatch Cases)!")
    except Exception as e:
        print("[Startup Seed Notice]", e)
        db.rollback()
    finally:
        db.close()

seed_demo_data()

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "civicpulse-api"}
