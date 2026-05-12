# Build backend dependencies and app
FROM python:3.11-slim AS backend-builder
WORKDIR /app/backend
RUN apt-get update && apt-get install -y build-essential curl && rm -rf /var/lib/apt/lists/*
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir pydantic-settings
COPY backend /app/backend
RUN mkdir -p /app/backend/data/chroma /app/backend/data/uploads

# Build frontend assets
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install
COPY frontend /app/frontend
RUN npm run build

# Final image: nginx + uvicorn backend
FROM nginx:alpine
WORKDIR /app
COPY --from=backend-builder /app/backend /app/backend
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY root-entrypoint.sh /app/root-entrypoint.sh
RUN chmod +x /app/root-entrypoint.sh && mkdir -p /app/backend/data/chroma /app/backend/data/uploads
EXPOSE 80
CMD ["/app/root-entrypoint.sh"]
