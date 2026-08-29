from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "sqlite:////tmp/civicpulse.db"
    app_env: str = "production"
    auth_secret: str = "gantavya-super-secure-secret-2026"
    ai_provider: str = "gemini"
    ai_provider_url: str = "https://api.openai.com/v1/chat/completions"
    ai_api_key: str = "AIzaSyARo-2HV0xm7gbzn5hg4_D-HyR9fe9zVoI"
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


