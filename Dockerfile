FROM node:24-bookworm-slim AS frontend
WORKDIR /build/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM python:3.13-slim-bookworm AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    CARDIOSCOPE_FRONTEND_DIR=/app/web/dist \
    OMP_NUM_THREADS=1 \
    OPENBLAS_NUM_THREADS=1 \
    MKL_NUM_THREADS=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*
COPY constraints.txt ./
COPY deploy/requirements.txt ./deploy/requirements.txt
COPY api/requirements.txt ./api/requirements.txt
RUN pip install --no-cache-dir -r deploy/requirements.txt
COPY api/app/ ./api/app/
COPY ml/src/_shap_compat.py ./ml/src/_shap_compat.py
COPY ml/artifacts/ ./ml/artifacts/
COPY --from=frontend /build/web/dist/ ./web/dist/
RUN useradd --create-home --uid 10001 cardioscope
USER cardioscope
EXPOSE 8001
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:' + os.environ.get('PORT', '8001') + '/api/health', timeout=8)"
CMD ["sh", "-c", "exec uvicorn app.main:app --app-dir api --host 0.0.0.0 --port \"${PORT:-8001}\" --workers 1"]
