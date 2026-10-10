"""Boundary validation: leakage fields and malformed input must be rejected
with 422 before any model sees them (traceability: requirement 1d)."""
from __future__ import annotations

import copy


def test_leakage_target_rejected(client, sample_payload):
    payload = copy.deepcopy(sample_payload)
    payload["Cath"] = 1
    assert client.post("/api/predict", json=payload).status_code == 422


def test_all_leakage_targets_rejected(client, sample_payload):
    for target in ("Cath", "LAD", "LCX", "RCA"):
        payload = copy.deepcopy(sample_payload)
        payload[target] = 0
        assert (
            client.post("/api/predict", json=payload).status_code == 422
        ), target


def test_dropped_constant_column_rejected(client, sample_payload):
    payload = copy.deepcopy(sample_payload)
    payload["Exertional CP"] = "N"
    assert client.post("/api/predict", json=payload).status_code == 422


def test_missing_feature_rejected(client, sample_payload):
    payload = copy.deepcopy(sample_payload)
    del payload["Age"]
    assert client.post("/api/predict", json=payload).status_code == 422


def test_unknown_category_value_rejected(client, sample_payload):
    payload = copy.deepcopy(sample_payload)
    payload["Sex"] = "Other"
    assert client.post("/api/predict", json=payload).status_code == 422


def test_invalid_rbwma_rejected(client, sample_payload):
    payload = copy.deepcopy(sample_payload)
    payload["Region RWMA"] = "5"
    assert client.post("/api/predict", json=payload).status_code == 422


def test_region_rwma_string_accepted(client, sample_payload):
    payload = copy.deepcopy(sample_payload)
    payload["Region RWMA"] = "2"
    assert client.post("/api/predict", json=payload).status_code == 200


def test_region_rwma_coerced_to_int():
    from app.service import build_row

    row = build_row({"Region RWMA": "2", "Age": 59})
    assert row["Region RWMA"].dtype.kind in "iu"
    assert int(row["Region RWMA"].iloc[0]) == 2
