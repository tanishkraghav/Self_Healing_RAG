from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Groq (free API - get key at console.groq.com)
    groq_api_key: str
    groq_model: str = "llama-3.1-8b-instant"         # free, ultra-fast
    groq_critic_model: str = "llama-3.1-8b-instant"  # free, critic model

    # Embeddings: local sentence-transformers (100% free, no API needed)
    embedding_model: str = "all-MiniLM-L6-v2"

    # Vector store
    chroma_persist_dir: str = "./data/chroma"
    upload_dir: str = "./data/uploads"

    # Pipeline config
    max_retries: int = 3
    critic_threshold: float = 0.7
    chunk_size: int = 1000
    chunk_overlap: int = 200
    retrieval_k: int = 5
    cors_origins: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    class Config:
        env_file = ".env"


settings = Settings()
