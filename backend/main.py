from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.routes import router
from app.core.config import settings
import os

app = FastAPI(
    title="Self-Healing RAG API",
    description="A RAG pipeline that critiques its own output and retries using LangGraph",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

if os.path.isdir("static"):
    app.mount("/", StaticFiles(directory="static", html=True), name="static")


@app.get("/")
async def root():
    return {
        "name": "Self-Healing RAG",
        "version": "1.0.0",
        "docs": "/docs",
    }
