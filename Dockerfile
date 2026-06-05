# Stage 1: Build Angular SPA
FROM node:20-alpine AS frontend
WORKDIR /web
COPY web/package*.json ./
RUN npm ci --silent
COPY web/ ./
RUN npm run build
# Angular 18 outputs to ../app/static/dist/browser relative to /web
# That resolves to /app/static/dist/browser inside this container

# Stage 2: Python runtime with embedded Angular app
FROM python:3.12-slim

ARG VERSION=dev
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    ROUTER_APP_VERSION=${VERSION}

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ /app/

# Copy Angular build output from frontend stage
# Angular 18 builder places output in browser/ subdirectory
COPY --from=frontend /app/static/dist/browser /app/static/dist/browser

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8000/api/v1/health || exit 1

CMD ["python", "app.py"]
