# Build frontend assets
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install
COPY frontend /app/frontend
RUN npm run build

# Final runtime image with Python backend and nginx frontend
FROM python:3.11-slim
WORKDIR /app

RUN apt-get update && apt-get install -y nginx curl && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir pydantic-settings

COPY backend /app/backend
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY root-entrypoint.sh /app/root-entrypoint.sh
RUN chmod +x /app/root-entrypoint.sh && mkdir -p /app/backend/data/chroma /app/backend/data/uploads

EXPOSE 80
CMD ["/app/root-entrypoint.sh"]
