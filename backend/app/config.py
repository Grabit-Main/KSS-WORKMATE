from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SECRET_KEY: str = "secret-key-workmate-production"
    DEBUG: bool = False
    ALLOWED_ORIGINS: str = "http://localhost:5173,https://kss-workmate.vercel.app,http://localhost:3000"

    DATABASE_URL: str = ""
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""

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
        env_file = ".env"
        extra = "ignore"


settings = Settings()
