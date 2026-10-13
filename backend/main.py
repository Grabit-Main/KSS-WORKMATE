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
        chat, upload, analytics, reviews, notifications, history, kpi, mywork, documentation, holidays
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
