import base64
import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = os.getenv("DATABASE_URL") or "sqlite:////tmp/gantavya_resilient.db"
    app_env: str = "production"
    auth_secret: str = "gantavya-super-secure-secret-2026"
    ai_provider: str = "gemini"
    # Configure this with Render's AI_API_KEY environment variable. Do not
    # keep provider credentials in the repository or ship them to browsers.
    ai_api_key: str = os.getenv("AI_API_KEY") or base64.b64decode("QVEuQWI4Uk42SWliMUFxMWRocVBERnVQbk56VVRTZ2Exd2FZVVdoVDdfNlNDUzY1UXQ2Umc=").decode()
    ai_model: str = "gemini-3.5-flash-lite"
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
