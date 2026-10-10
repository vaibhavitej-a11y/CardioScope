"""Shared fixtures: TestClient (runs the lifespan, so models load) and a
schema-derived 54-feature payload representing a population-average patient."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

API_DIR = Path(__file__).resolve().parents[1]
REPO = API_DIR.parent
ART = REPO / "ml" / "artifacts"

if str(API_DIR) not in sys.path:
    sys.path.insert(0, str(API_DIR))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client() -> TestClient:
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def schema() -> dict:
    return json.loads((ART / "feature_schema.json").read_text(encoding="utf-8"))


@pytest.fixture(scope="session")
def sample_payload(schema: dict) -> dict:
    payload = {
        name: stats["mean"]
        for name, stats in schema["numeric_features"].items()
    }
    payload.update(
        {name: values[0] for name, values in schema["categorical_features"].items()}
    )
    return payload
