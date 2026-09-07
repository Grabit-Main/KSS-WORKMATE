from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

from app.routers import (
    auth, users, projects, teams, tasks,
    chat, upload, analytics, reviews, notifications
)
from app.websocket.router import router as websocket_router

app = FastAPI(title="Workmate API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
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
app.include_router(notifications.router)
app.include_router(websocket_router)

@app.get("/")
def root():
    return {"message": "Workmate API is running"}
