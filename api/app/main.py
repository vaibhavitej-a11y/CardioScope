"""FastAPI application — loads models at startup, serves them afterwards.

    cd api && uvicorn app.main:app --port 8001

The Vite dev server proxies /api to this port (web/vite.config.ts), so the
browser never talks cross-origin during development.
"""
from __future__ import annotations

from contextlib import asynccontextmanager
import os
from pathlib import Path

from fastapi import FastAPI

from app.routes.predict import router
from app.service import ModelService
from app.hosting import mount_frontend


@asynccontextmanager
async def lifespan(app: FastAPI):
    service = ModelService()
    service.load()
    app.state.service = service
    yield


app = FastAPI(
    title="CardioScope Prediction API",
    description=(
        "CAD / stenosis risk prediction with SHAP explanations. "
        "POST /api/predict scores one patient (54 features) and returns "
        "probabilities plus per-feature contributions."
    ),
    version="1.0.0",
    lifespan=lifespan,
)
app.include_router(router)

frontend_path = os.environ.get("CARDIOSCOPE_FRONTEND_DIR")
mount_frontend(
    app,
    Path(frontend_path) if frontend_path else Path(__file__).resolve().parents[2] / "web" / "dist",
    required=frontend_path is not None,
)
