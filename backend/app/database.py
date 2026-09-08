from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

from sqlalchemy.pool import NullPool
import os

db_url = settings.DATABASE_URL or os.getenv("DATABASE_URL", "")
if not db_url:
    db_url = "postgresql://postgres.wdtvedyfmtdqnvvhgcso:Kalpanaaa123@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres"
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# In serverless environments (Vercel / AWS Lambda), use NullPool to avoid frozen connection pool deadlocks
is_serverless = bool(os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"))

if is_serverless:
    engine = create_engine(
        db_url,
        poolclass=NullPool,
        connect_args={"connect_timeout": 5}
    )
else:
    engine = create_engine(
        db_url,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        pool_recycle=300,
        connect_args={"connect_timeout": 5}
    )
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
