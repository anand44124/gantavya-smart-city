import base64, hashlib, hmac, json, os, time
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from config.settings import settings
from db import get_db
from models.entities import User

bearer = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 310000)
    return base64.b64encode(salt + digest).decode()

def verify_password(password: str, encoded: str) -> bool:
    raw = base64.b64decode(encoded.encode())
    return hmac.compare_digest(raw[16:], hashlib.pbkdf2_hmac("sha256", password.encode(), raw[:16], 310000))

def create_token(user: User) -> str:
    payload = base64.urlsafe_b64encode(json.dumps({"sub": user.id, "role": user.role, "exp": int(time.time()) + 86400}).encode()).decode().rstrip("=")
    signature = hmac.new(settings.auth_secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}.{signature}"

def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    try:
        payload, signature = credentials.credentials.split(".")
        expected = hmac.new(settings.auth_secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
        data = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
        if not hmac.compare_digest(signature, expected) or data["exp"] < time.time():
            raise ValueError
        user = db.get(User, int(data["sub"]))
        if not user:
            try:
                from main import seed_demo_data
                seed_demo_data()
                user = db.get(User, int(data["sub"]))
            except Exception:
                pass
    except (ValueError, KeyError, json.JSONDecodeError, TypeError):
        user = None
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session")
    return user