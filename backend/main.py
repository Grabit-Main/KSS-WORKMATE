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
init_error = None

try:
    from app.config import settings
    from app.routers import (
        auth, users, projects, teams, tasks,
        chat, upload, analytics, reviews, notifications, history, kpi
    )
    from app.websocket.router import router as websocket_router

    cors_origins = list(set(settings.origins + [
        "https://kss-workmate.vercel.app",
        "https://kss-workmate.onrender.com",
    ]))

    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_origin_regex=r"https://.*\.vercel\.app|http://localhost:\d+|http://127\.0\.0\.1:\d+",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

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
