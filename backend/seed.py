from db import Base, SessionLocal, engine
from auth import hash_password
from models.entities import User

DEMO_USERS = [
    ("CivicPulse Admin", "admin@civicpulse.demo", "Admin@123", "admin"),
    ("Arjun Kumar", "worker1@civicpulse.demo", "Worker@123", "worker"),
    ("Meera Shah", "worker2@civicpulse.demo", "Worker@123", "worker"),
    ("Ravi Patel", "worker3@civicpulse.demo", "Worker@123", "worker"),
] + [(f"Demo Citizen {index}", f"citizen{index}@civicpulse.demo", "Citizen@123", "citizen") for index in range(1, 11)]

Base.metadata.create_all(bind=engine)
db = SessionLocal()
try:
    for name, email, password, role in DEMO_USERS:
        if not db.query(User).filter(User.email == email).first():
            db.add(User(full_name=name, email=email, password_hash=hash_password(password), role=role))
    db.commit()
finally:
    db.close()
print(f"Seeded {len(DEMO_USERS)} demo accounts idempotently")
