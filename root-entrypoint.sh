#!/bin/sh
set -e

if [ -z "$GROQ_API_KEY" ] || [ "$GROQ_API_KEY" = "your_groq_api_key_here" ]; then
  echo "✗ GROQ_API_KEY not set"
  echo "  Get your free key at: https://console.groq.com"
  exit 1
fi

echo "✓ GROQ_API_KEY loaded"

mkdir -p /app/backend/data/chroma /app/backend/data/uploads
cd /app/backend

uvicorn main:app --host 0.0.0.0 --port 8000 &

nginx -g 'daemon off;'
