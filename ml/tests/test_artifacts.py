"""
Artifact contract tests — what the API (M2) is allowed to rely on.

Every assertion here is a promise to the backend. If one of these fails,
M2's loader breaks.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
import data as D  # noqa: E402

ART = Path(__file__).resolve().parents[1] / "artifacts"
TARGETS = ("Cath", "LAD", "LCX", "RCA")
ALL_METRICS = ("accuracy", "precision", "recall", "f1", "roc_auc")

pytestmark = pytest.mark.skipif(
    not (ART / "feature_schema.json").exists(),
    reason="artifacts not built yet — run: python ml/src/train.py",
)


def _load(target: str) -> dict:
    return joblib.load(ART / f"{target}.joblib")


@pytest.mark.parametrize("target", TARGETS)
def test_bundle_shape(target: str):
    b = _load(target)
    assert b["target"] == target
    assert b["selected_model"] in {"lightgbm", "xgboost", "catboost"}
    assert b["pipeline"] is not None
    assert len(b["feature_names"]) == 54
    assert 0.0 < b["threshold"] < 1.0
    assert b["shap_mode"] != "failed", f"{target}: SHAP unavailable"
    assert len(b["shap_mean_abs"]) > 0, f"{target}: empty SHAP summary"


@pytest.mark.parametrize("target", TARGETS)
def test_pipeline_predicts_one_patient(target: str):
    """The exact call M2 will make: one row in, four probabilities out."""
    b = _load(target)
    raw = D.clean(D.load_raw())
    X, _ = D.split(raw)
    row = X.iloc[[0]]

    p = b["pipeline"].predict_proba(row)[0]
    assert len(p) == 2
    proba = float(p[1])
    assert 0.0 <= proba <= 1.0, f"{target}: probability {proba} out of range"

    label = b["positive_label"] if proba >= b["threshold"] else b["negative_label"]
    assert label in (b["positive_label"], b["negative_label"])


@pytest.mark.parametrize("target", TARGETS)
def test_shap_explains_one_patient(target: str):
    """SHAP contribution vector must match the transformed feature width."""
    b = _load(target)
    raw = D.clean(D.load_raw())
    X, _ = D.split(raw)
    row = X.iloc[[0]]

    explainer = b["shap_explainer"]
    assert explainer is not None, f"{target}: no explainer saved"

    Xt = b["pipeline"].named_steps["prep"].transform(row)
    sv = explainer.shap_values(Xt)
    if isinstance(sv, list):
        sv = sv[-1]
    sv = np.asarray(sv)
    if sv.ndim == 3:
        sv = sv[:, :, -1]
    assert sv.shape[1] == Xt.shape[1], (
        f"{target}: SHAP width {sv.shape[1]} != features {Xt.shape[1]}"
    )


def test_feature_schema_excludes_targets():
    schema = json.loads((ART / "feature_schema.json").read_text(encoding="utf-8"))
    assert schema["n_features"] == 54
    assert not (set(TARGETS) & set(schema["feature_names"]))
    assert schema["feature_names"] == list(
        D.feature_columns(D.clean(D.load_raw()))
    )


def test_metrics_covers_all_five_required_metrics():
    """Requirement 1e: accuracy, precision, recall, F1-score, ROC-AUC."""
    m = json.loads((ART / "metrics.json").read_text(encoding="utf-8"))
    for t in TARGETS:
        block = m["targets"][t]
        for stat in ("cv", "oof", "oof_threshold_tuned"):
            missing = [k for k in ALL_METRICS if k not in block[stat]]
            assert not missing, f"{t}/{stat} missing {missing}"
        assert 0.0 <= block["oof"]["roc_auc"] <= 1.0
        assert 0.0 <= block["threshold"] <= 1.0
        assert block["selected"] in {"lightgbm", "xgboost", "catboost"}


def test_manifest_records_dataset_hash_and_versions():
    m = json.loads((ART / "manifest.json").read_text(encoding="utf-8"))
    assert m["dataset_sha256"] == D.dataset_sha256()
    assert m["seed"] if "seed" in m else True
    for pkg in ("numpy", "scikit-learn", "lightgbm", "xgboost", "catboost", "shap"):
        assert m["versions"][pkg] != "unknown", f"version of {pkg} not recorded"
    assert set(m["artifacts"]) == {f"{t}.joblib" for t in TARGETS}
