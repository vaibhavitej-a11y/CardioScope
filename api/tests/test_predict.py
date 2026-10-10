"""Happy-path contract tests for GET /health and POST /api/predict."""
from __future__ import annotations


def test_health_reports_loaded_models(client):
    body = client.get("/api/health").json()
    assert body["status"] == "ok"
    assert body["targets"] == ["Cath", "LAD", "LCX", "RCA"]
    assert set(body["models"].values()) <= {"lightgbm", "xgboost", "catboost"}
    assert all(mode != "failed" for mode in body["shap_modes"].values())


def test_predict_matches_frozen_contract(client, sample_payload, schema):
    response = client.post("/api/predict", json=sample_payload)
    assert response.status_code == 200
    body = response.json()

    assert set(body) == {"cad", "vessels", "shap"}
    assert set(body["vessels"]) == {"LAD", "LCX", "RCA"}
    assert set(body["shap"]) == {"cad", "LAD", "LCX", "RCA"}

    for name, value in [("cad", body["cad"]), *body["vessels"].items()]:
        assert 0.0 <= value <= 1.0, f"{name}={value} not a probability"

    feature_names = set(schema["feature_names"])
    for scope, breakdown in body["shap"].items():
        assert isinstance(breakdown["label"], str) and breakdown["label"]
        contributions = breakdown["contributions"]
        assert len(contributions) == len(feature_names), scope
        assert {c["feature"] for c in contributions} == feature_names, scope
        magnitudes = [abs(c["value"]) for c in contributions]
        assert magnitudes == sorted(magnitudes, reverse=True), scope


def test_predict_is_deterministic(client, sample_payload):
    first = client.post("/api/predict", json=sample_payload)
    second = client.post("/api/predict", json=sample_payload)
    assert first.status_code == second.status_code == 200
    assert first.json() == second.json()


def test_config_serves_disclaimer(client, schema):
    from app.constants import DISCLAIMER_TEXT

    body = client.get("/api/config").json()
    assert body["disclaimer"] == DISCLAIMER_TEXT
