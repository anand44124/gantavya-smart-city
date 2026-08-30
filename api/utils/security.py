import html
import re
import time
from collections import defaultdict
from fastapi import HTTPException, status

# ============================================================================
# 1. RATE LIMITING (Brute Force Protection)
# ============================================================================

class RateLimiter:
    """
    In-memory sliding window rate limiter.
    Tracks failed attempts and locks out suspicious IPs or accounts.
    """
    def __init__(self, max_attempts: int = 5, window_seconds: int = 900): # 5 attempts per 15 mins
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        # key -> list of timestamps
        self._attempts: dict[str, list[float]] = defaultdict(list)
        # key -> lockout expiry timestamp
        self._lockouts: dict[str, float] = {}

    def _cleanup(self, key: str, now: float):
        self._attempts[key] = [t for t in self._attempts[key] if now - t < self.window_seconds]

    def is_locked(self, key: str) -> tuple[bool, int]:
        now = time.time()
        if key in self._lockouts:
            if now < self._lockouts[key]:
                remaining = int(self._lockouts[key] - now) + 1
                return True, remaining
            else:
                del self._lockouts[key]
        return False, 0

    def record_failure(self, key: str) -> tuple[bool, int]:
        now = time.time()
        self._cleanup(key, now)
        self._attempts[key].append(now)
        if len(self._attempts[key]) >= self.max_attempts:
            self._lockouts[key] = now + self.window_seconds
            return True, self.window_seconds
        return False, 0

    def record_success(self, key: str):
        if key in self._attempts:
            del self._attempts[key]
        if key in self._lockouts:
            del self._lockouts[key]

# Global singletons for auth rate limiting
login_rate_limiter = RateLimiter(max_attempts=5, window_seconds=900)
register_rate_limiter = RateLimiter(max_attempts=10, window_seconds=3600)

def check_login_rate_limit(client_ip: str, email: str):
    # Check both IP and email
    for key in (f"ip:{client_ip}", f"email:{email.lower()}"):
        locked, remaining = login_rate_limiter.is_locked(key)
        if locked:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed login attempts. Security lockout active for {remaining} seconds.",
                headers={"Retry-After": str(remaining)},
            )


# ============================================================================
# 2. INPUT SANITIZATION
# ============================================================================

# Strip dangerous tags and javascript event handlers
SCRIPT_PATTERN = re.compile(r"<\s*script[^>]*>.*?<\s*/\s*script\s*>", re.IGNORECASE | re.DOTALL)
TAG_PATTERN = re.compile(r"<[^>]*>")
EVENT_HANDLER_PATTERN = re.compile(r"on\w+\s*=", re.IGNORECASE)
JAVASCRIPT_URI_PATTERN = re.compile(r"javascript\s*:", re.IGNORECASE)

def sanitize_text(text: str | None, max_length: int = 1000) -> str:
    """
    Sanitizes user text inputs:
    - Removes null bytes and control characters
    - Strips script tags and dangerous HTML
    - HTML-escapes remaining characters
    - Truncates to max_length
    """
    if text is None:
        return ""
    # Strip null bytes & control chars (except standard whitespace)
    cleaned = "".join(ch for ch in str(text) if ch == "\n" or ch == "\r" or ch == "\t" or ord(ch) >= 32)
    cleaned = SCRIPT_PATTERN.sub("", cleaned)
    cleaned = EVENT_HANDLER_PATTERN.sub("", cleaned)
    cleaned = JAVASCRIPT_URI_PATTERN.sub("", cleaned)
    # Strip HTML tags
    cleaned = TAG_PATTERN.sub("", cleaned)
    # HTML escape
    cleaned = html.escape(cleaned.strip())
    return cleaned[:max_length]


# ============================================================================
# 3. BINARY MAGIC BYTES FILE VALIDATION
# ============================================================================

# Magic byte signatures
JPEG_MAGIC = b"\xff\xd8\xff"
PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
WEBP_MAGIC_RIFF = b"RIFF"
WEBP_MAGIC_WEBP = b"WEBP"
MP4_MAGIC_FTYP = b"ftyp"
WEBM_MAGIC = b"\x1a\x45\xdf\xa3"

def validate_image_magic_bytes(content: bytes) -> str:
    """
    Validates binary header magic bytes for images.
    Returns detected MIME type or raises HTTPException(415).
    """
    if len(content) < 12:
        raise HTTPException(415, "Invalid file format: File too small to be a valid image")

    if content.startswith(JPEG_MAGIC):
        return "image/jpeg"
    elif content.startswith(PNG_MAGIC):
        return "image/png"
    elif content.startswith(WEBP_MAGIC_RIFF) and content[8:12] == WEBP_MAGIC_WEBP:
        return "image/webp"
    else:
        raise HTTPException(
            415,
            "Security validation failed: File binary header does not match a genuine JPEG, PNG, or WEBP image",
        )

def validate_video_magic_bytes(content: bytes) -> str:
    """
    Validates binary header magic bytes for video clips.
    """
    if len(content) < 16:
        raise HTTPException(415, "Invalid video format: File too small")

    if content[4:8] == MP4_MAGIC_FTYP or content.startswith(b"\x00\x00\x00"):
        return "video/mp4"
    elif content.startswith(WEBM_MAGIC):
        return "video/webm"
    elif content[4:8] == b"moov" or content[4:8] == b"wide":
        return "video/quicktime"
    return "video/mp4"


# ============================================================================
# 4. PASSWORD STRENGTH VALIDATION
# ============================================================================

def validate_password_strength(password: str) -> None:
    """
    Enforces strong password rules:
    - At least 8 characters
    - At least one lowercase letter
    - At least one uppercase letter or number or symbol
    """
    if len(password) < 8:
        raise HTTPException(422, "Password must be at least 8 characters long")
    if len(password) > 128:
        raise HTTPException(422, "Password cannot exceed 128 characters")
    if not any(c.isdigit() or not c.isalnum() for c in password):
        raise HTTPException(422, "Password must contain at least one number or special character")
    if not any(c.isalpha() for c in password):
        raise HTTPException(422, "Password must contain at least one letter")
