import os
from pydantic_settings import BaseSettings

# Locate .env in backend directory or current directory
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_env = os.path.join(backend_dir, ".env")
env_files = [".env"]
if os.path.exists(backend_env):
    env_files.insert(0, backend_env)


class Settings(BaseSettings):
    SECRET_KEY: str = "secret-key-workmate-production"
    DEBUG: bool = False
    ALLOWED_ORIGINS: str = "http://localhost:5173,https://kss-workmate.vercel.app,http://localhost:3000"

    DATABASE_URL: str = "postgresql://postgres.wdtvedyfmtdqnvvhgcso:Kalpanaaa123@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres"
    SUPABASE_URL: str = "https://wdtvedyfmtdqnvvhgcso.supabase.co"
    SUPABASE_KEY: str = "sb_publishable_9CTIC0REo14-8DCQQJqG8g_n1pc3T9h"

    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_PROJECT_ID: str = ""
    GOOGLE_REFRESH_TOKEN: str = ""

    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "Kalpanaaa Software Solutions <no-reply@kalpanaaa.in>"

    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 525600  # 1 year - no auto logout
    REFRESH_TOKEN_EXPIRE_DAYS: int = 365

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    class Config:
        env_file = env_files
        extra = "ignore"


settings = Settings()
