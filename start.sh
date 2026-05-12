#!/bin/bash
set -e

echo "=== Self-Healing RAG — Local Setup ==="

# Check .env
if [ ! -f .env ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
  echo "⚠  Please edit .env and set your OPENAI_API_KEY, then re-run this script."
  exit 1
fi

source .env
if [ -z "$GROQ_API_KEY" ] || [ "$GROQ_API_KEY" = "your_groq_api_key_here" ]; then
  echo "✗ GROQ_API_KEY not set in .env"
  echo "  Get your free key at: https://console.groq.com"
  exit 1
fi

echo "✓ .env loaded"

# Backend
echo ""
echo "--- Setting up backend ---"
cd backend

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi

source .venv/bin/activate
pip install -q -r requirements.txt
pip install -q pydantic-settings

mkdir -p data/chroma data/uploads

if [ ! -f ".env" ]; then
  cp .env.example .env
fi

echo "✓ Backend ready"

# Start backend in background
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
echo "✓ Backend running (PID $BACKEND_PID)"

cd ..

# Frontend
echo ""
echo "--- Setting up frontend ---"
cd frontend

npm install --silent
echo "✓ Frontend dependencies installed"

# Start frontend
npm run dev &
FRONTEND_PID=$!
echo "✓ Frontend running (PID $FRONTEND_PID)"

cd ..

echo ""
echo "========================================="
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "  API docs: http://localhost:8000/docs"
echo "========================================="
echo ""
echo "Press Ctrl+C to stop all services"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
