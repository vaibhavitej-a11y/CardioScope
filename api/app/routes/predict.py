"""Endpoints: POST /api/predict plus health/config helpers."""
from __future__ import annotations

from fastapi import APIRouter, Request

from app.constants import DISCLAIMER_TEXT
from app.schemas import PatientInput, Prediction

router = APIRouter(prefix="/api")


@router.post("/predict", response_model=Prediction)
def predict(payload: PatientInput, request: Request) -> Prediction:
    """Score one patient: CAD probability, three vessel probabilities and
    SHAP contributions per target (contract: web/src/api/types.ts)."""
    service = request.app.state.service
    return service.predict(payload)


@router.get("/health")
def health(request: Request) -> dict:
    """Readiness probe: models loaded, selected algorithms, SHAP modes."""
    return request.app.state.service.health()


@router.get("/config")
def config() -> dict:
    """App constants (requirement 5 — disclaimer single-sourced)."""
    return {"disclaimer": DISCLAIMER_TEXT}
