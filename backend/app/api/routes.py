import os
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List

from app.agents.rag_pipeline import run_pipeline
from app.core.vector_store import vector_store
from app.core.config import settings

router = APIRouter()


# ─── Schemas ──────────────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    query: str


class QueryResponse(BaseModel):
    query: str
    answer: str
    critic_score: float
    critic_reasoning: str
    critic_passed: bool
    retries: int
    is_fallback: bool
    trace: List[dict]
    sources: List[dict]


# ─── Query endpoint ───────────────────────────────────────────────────────────

@router.post("/query", response_model=QueryResponse)
async def query_documents(request: QueryRequest):
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    try:
        result = run_pipeline(request.query.strip())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Document upload ──────────────────────────────────────────────────────────

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md"}


@router.post("/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    os.makedirs(settings.upload_dir, exist_ok=True)
    file_path = os.path.join(settings.upload_dir, file.filename)

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        result = vector_store.add_documents(file_path, file.filename)
        return {"success": True, **result}
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")


# ─── Document list ────────────────────────────────────────────────────────────

@router.get("/documents")
async def list_documents():
    stats = vector_store.get_collection_stats()
    return stats


@router.delete("/documents/{filename}")
async def delete_document(filename: str):
    deleted = vector_store.delete_document(filename)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")
    file_path = os.path.join(settings.upload_dir, filename)
    if os.path.exists(file_path):
        os.remove(file_path)
    return {"success": True, "message": f"'{filename}' deleted"}


# ─── Health ───────────────────────────────────────────────────────────────────

@router.get("/health")
async def health():
    stats = vector_store.get_collection_stats()
    return {
        "status": "healthy",
        "chunks_indexed": stats["total_chunks"],
        "documents": len(stats["documents"]),
    }
