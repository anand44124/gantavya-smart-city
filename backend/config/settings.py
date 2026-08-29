from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "sqlite:///./civicpulse.db"
    app_env: str = "development"
    auth_secret: str = "change-me-in-development"
    ai_provider: str = "openai"
    ai_provider_url: str = "https://api.openai.com/v1/chat/completions"
    ai_api_key: str = ""
    ai_model: str = "gemini-3.6-flash"
    upload_dir: str = "./uploads"
    smtp_server: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_name: str = "Gantavya Smart City Portal"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

