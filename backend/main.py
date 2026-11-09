import sys
import os
import traceback

# Ensure current directory is in sys.path for Vercel Serverless Functions
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(title="Workmate API")

from app.config import settings

cors_origins = list(set([
    *settings.origins,
    "https://kalpanaaa-workmate.vercel.app",
    "https://kss-workmate.onrender.com",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"http://localhost:\d+|http://127\.0\.0\.1:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

@app.middleware("http")
async def normalize_api_path(request, call_next):
    if request.scope.get("path", "").startswith("/api/api/"):
        request.scope["path"] = request.scope["path"].replace("/api/api/", "/api/", 1)
    response = await call_next(request)
    return response

init_error = None

try:
    from app.config import settings
    from app.database import engine, Base
    from app.routers import (
        auth, users, projects, teams, tasks,
        chat, upload, analytics, reviews, notifications, history, kpi, mywork, documentation, holidays, goals, push_notifications
    )
    from app.websocket.router import router as websocket_router

    # Auto-create tables for new schema entities if missing
    try:
        Base.metadata.create_all(bind=engine)
        from sqlalchemy import text
        with engine.begin() as conn:
            conn.execute(text("""
                ALTER TABLE mywork_focus_sessions 
                ADD COLUMN IF NOT EXISTS session_id VARCHAR,
                ADD COLUMN IF NOT EXISTS accomplishment TEXT,
                ADD COLUMN IF NOT EXISTS remaining_work TEXT,
                ADD COLUMN IF NOT EXISTS started_at TIMESTAMP,
                ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP;

                ALTER TABLE reviews 
                ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'Pending',
                ADD COLUMN IF NOT EXISTS is_acknowledged BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP;

                CREATE TABLE IF NOT EXISTS chat_message_reads (
                    id UUID PRIMARY KEY,
                    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
                    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT uq_chat_message_read UNIQUE (message_id, user_id)
                );
                CREATE INDEX IF NOT EXISTS ix_chat_message_reads_message_id ON chat_message_reads(message_id);
                CREATE INDEX IF NOT EXISTS ix_chat_message_reads_user_id ON chat_message_reads(user_id);

                CREATE TABLE IF NOT EXISTS goals (
                    id UUID PRIMARY KEY,
                    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    title VARCHAR NOT NULL,
                    category VARCHAR DEFAULT 'Technical Skills',
                    type VARCHAR DEFAULT 'Technical',
                    priority VARCHAR DEFAULT 'Medium',
                    start_date VARCHAR,
                    target_date VARCHAR,
                    duration VARCHAR,
                    progress INTEGER DEFAULT 0,
                    milestones_completed INTEGER DEFAULT 0,
                    milestones_total INTEGER DEFAULT 0,
                    update_frequency VARCHAR DEFAULT 'Daily',
                    status VARCHAR DEFAULT 'In Progress',
                    time_spent VARCHAR DEFAULT '0 hrs',
                    icon_type VARCHAR DEFAULT 'react',
                    description TEXT,
                    target_outcome TEXT,
                    next_steps TEXT,
                    challenges TEXT,
                    activities TEXT,
                    resources JSON DEFAULT '[]'::json,
                    milestones JSON DEFAULT '[]'::json,
                    progress_history JSON DEFAULT '[]'::json,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS ix_goals_user_id ON goals(user_id);
                ALTER TABLE goals ADD COLUMN IF NOT EXISTS progress_history JSON DEFAULT '[]'::json;

                CREATE TABLE IF NOT EXISTS push_subscriptions (
                    id UUID PRIMARY KEY,
                    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    endpoint TEXT NOT NULL UNIQUE,
                    p256dh VARCHAR(255) NOT NULL,
                    auth VARCHAR(255) NOT NULL,
                    user_agent VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS ix_push_subscriptions_user_id ON push_subscriptions(user_id);
            """))
    except Exception as db_err:
        print("Table creation warning:", db_err)

    app.include_router(auth.router)
    app.include_router(users.router)
    app.include_router(projects.router)
    app.include_router(teams.router)
    app.include_router(tasks.router)
    app.include_router(chat.router)
    app.include_router(upload.router)
    app.include_router(analytics.router)
    app.include_router(reviews.router)
    app.include_router(history.router)
    app.include_router(notifications.router)
    app.include_router(kpi.router)
    app.include_router(mywork.router)
    app.include_router(documentation.router)
    app.include_router(holidays.router)
    app.include_router(goals.router)
    app.include_router(push_notifications.router)
    app.include_router(websocket_router)
except Exception as e:
    init_error = traceback.format_exc()
    print("BACKEND INITIALIZATION EXCEPTION:", init_error)

@app.get("/")
def root():
    if init_error:
        return JSONResponse(status_code=500, content={"status": "error", "init_error": init_error})
    return {"message": "Workmate API is running", "status": "ok"}

@app.get("/api/health")
def health():
    if init_error:
        return JSONResponse(status_code=500, content={"status": "error", "init_error": init_error})
    return {"status": "ok", "message": "Workmate API is healthy"}
