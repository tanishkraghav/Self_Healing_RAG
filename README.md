# Self-Healing RAG Pipeline

A production-grade Retrieval-Augmented Generation system with a **critic agent** that evaluates every answer for hallucination and automatically retries with a reformulated query when the answer isn't grounded in the retrieved context.

Built with **LangGraph** (stateful cyclic graph), **FastAPI**, **ChromaDB**, and a custom **React** frontend.

> **100% Free Stack** — Groq free tier for LLM inference + local `sentence-transformers` for embeddings. No credit card needed.

---

## Free Stack Breakdown

| Component | Technology | Cost |
|---|---|---|
| LLM (generation) | Groq · `llama-3.1-8b-instant` | Free tier |
| LLM (critic) | Groq · `llama-3.1-8b-instant` | Free tier |
| Embeddings | `all-MiniLM-L6-v2` (local CPU) | Free forever |
| Vector store | ChromaDB (local file) | Free forever |
| Backend | FastAPI + LangGraph | Open source |
| Frontend | React + Vite | Open source |

Get your free Groq API key at: **https://console.groq.com** (no credit card required)

---

## Architecture

```
User Query
    │
    ▼
┌─────────────┐
│   RETRIEVE  │ ← MMR retrieval from ChromaDB (local embeddings)
└──────┬──────┘
       │ chunks
       ▼
┌─────────────┐
│   GENERATE  │ ← Groq LLaMA 3.1 8B, context-grounded prompt
└──────┬──────┘
       │ answer
       ▼
┌─────────────┐
│   CRITIQUE  │ ← Groq Mixtral 8x7B, structured JSON faithfulness score
└──────┬──────┘
       │
   PASS (≥0.7) ──────────────────► Return answer to user
       │
   FAIL (<0.7)
       │
       ▼
┌──────────────┐
│  REFORMULATE │ ← LLM rewrites query using critic feedback
└──────┬───────┘
       │
   retry_count < max_retries ──► RETRIEVE (loop)
       │
   exhausted
       ▼
┌──────────────┐
│   FALLBACK   │ ← "I don't have enough information"
└──────────────┘
```

## Features

- **Self-healing loop** — critic agent rejects hallucinated answers and retries with a smarter query
- **Dual-model setup** — fast LLaMA 3.1 for generation, Mixtral for high-quality critic evaluation
- **Local embeddings** — `all-MiniLM-L6-v2` runs entirely on CPU, zero cost, zero network calls
- **Structured critic** — returns JSON with score (0–1), reasoning, issues list, and PASS/FAIL verdict
- **Graceful fallback** — never hallucinates when context is insufficient; says "I don't know" instead
- **MMR retrieval** — Maximal Marginal Relevance for diverse, non-redundant chunks
- **Multi-format ingestion** — PDF, TXT, Markdown
- **Live pipeline trace** — frontend shows every node execution in real time
- **Query history** — browse past queries with critic scores

---

## Quick Start

### Step 1: Get your free Groq API key
1. Go to **https://console.groq.com**
2. Sign up (free, no credit card)
3. Create an API key

### Option A: Docker Compose (recommended)

```bash
# 1. Extract the project
cd self-healing-rag

# 2. Set your Groq key
cp .env.example .env
# Edit .env → paste your GROQ_API_KEY

# 3. Run everything
docker-compose up --build

# Frontend: http://localhost:3000
# API docs:  http://localhost:8000/docs
```

### Option B: Local Development

**Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pip install pydantic-settings

cp .env.example .env
# Edit .env → paste your GROQ_API_KEY

uvicorn main:app --reload --port 8000
```

> Note: First run downloads `all-MiniLM-L6-v2` (~90MB) to `~/.cache/huggingface`. Cached permanently after that.

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

---

## Configuration

| Variable | Default | Description |
|---|---|---|
| `GROQ_API_KEY` | required | Free key from console.groq.com |
| `GROQ_MODEL` | `llama-3.1-8b-instant` | Generation LLM (free) |
| `GROQ_CRITIC_MODEL` | `llama-3.1-8b-instant` | Critic LLM (free) |
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | Local CPU embeddings (free) |
| `MAX_RETRIES` | `3` | Max reformulation retries |
| `CRITIC_THRESHOLD` | `0.7` | Min score to pass critic |
| `CHUNK_SIZE` | `1000` | Characters per chunk |
| `CHUNK_OVERLAP` | `200` | Chunk overlap characters |
| `RETRIEVAL_K` | `5` | Chunks to retrieve per query |

### Alternative free Groq models you can use

```
llama-3.1-70b-versatile   # larger, smarter, still free
llama3-8b-8192            # older llama3
gemma2-9b-it              # Google Gemma 2
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/query` | Run the self-healing pipeline |
| `POST` | `/api/documents/upload` | Upload and index a document |
| `GET` | `/api/documents` | List indexed documents |
| `DELETE` | `/api/documents/{filename}` | Remove a document |
| `GET` | `/api/health` | Health check + stats |

---

## Project Structure

```
self-healing-rag/
├── backend/
│   ├── main.py                    # FastAPI app
│   ├── requirements.txt           # groq, sentence-transformers, chromadb
│   ├── Dockerfile
│   ├── app/
│   │   ├── api/routes.py          # REST endpoints
│   │   ├── agents/rag_pipeline.py # LangGraph state machine ← core logic
│   │   └── core/
│   │       ├── config.py          # Settings (Groq keys, thresholds)
│   │       └── vector_store.py    # ChromaDB + local HuggingFace embeddings
│   └── data/                      # Created at runtime
│       ├── chroma/                # Vector store persistence
│       └── uploads/               # Uploaded files
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Main layout
│   │   ├── components/
│   │   │   ├── PipelineTrace.jsx  # Animated execution trace
│   │   │   ├── CriticPanel.jsx    # Score arc + verdict
│   │   │   ├── DocumentUploader.jsx
│   │   │   ├── SourcesPanel.jsx
│   │   │   └── QueryHistory.jsx
│   │   └── utils/api.js
│   ├── Dockerfile
│   └── nginx.conf
└── docker-compose.yml
```

---

## Interview Talking Points

- **LangGraph state machine** with typed state, conditional edges, and cycle detection
- **Dual-model critic** — separate Mixtral call with strict JSON schema enforcement
- **Free local embeddings** — `sentence-transformers` MiniLM, no API cost, offline capable
- **MMR retrieval** reduces redundant chunks vs. naive cosine similarity top-K
- **Graceful degradation** — system never hallucinates; it knows what it doesn't know
- **Zero vendor lock-in** — swap Groq for any OpenAI-compatible endpoint in one line
