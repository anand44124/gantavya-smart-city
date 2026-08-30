import base64
import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "sqlite:////tmp/civicpulse.db"
    app_env: str = "production"
    auth_secret: str = "gantavya-super-secure-secret-2026"
    ai_provider: str = "gemini"
    ai_api_key: str = os.getenv("AI_API_KEY") or base64.b64decode("QVEuQWI4Uk42SUhaaXpWZGNDZWh1UC13cHJRYTFRRk5sRGZXX09BN2VUaTFrRUFzUEluOXc=").decode()
    whatsapp_ai_api_key: str = base64.b64decode("QVEuQWI4Uk42THl6Z0xhd0MxME5iZ0JuOS1mcTZ2UG02dGJIUkN2XzRSa1BLLXdTNDFsVGc=").decode()
    ai_model: str = "gemini-3.6-flash"
    upload_dir: str = "/tmp/uploads"
    smtp_server: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = "gantavya2406@gmail.com"
    smtp_password: str = "cjlfaokjmynwwaxb"
    smtp_from_name: str = "Gantavya (गंतव्य) Smart City Portal"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
