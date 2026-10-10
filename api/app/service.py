"""Model service — loads the four joblib bundles, answers one request.

The serving path mirrors ml/tests/test_artifacts.py: one 54-column row in,
four probabilities plus SHAP contributions out. SHAP runs on the transformed
81-column matrix and one-hot contributions are summed back onto the 54
original feature names so the dashboard's findFeature() can pair them with
form measurements.

ensure_shap_importable() must run before any joblib.load: unpickling a
bundle imports shap, and on machines where the Code Integrity policy blocks
llvmlite.dll that crashes without the numba stub (ml/src/_shap_compat.py).
"""
from __future__ import annotations

import logging
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[2]
ML_SRC = REPO_ROOT / "ml" / "src"
if str(ML_SRC) not in sys.path:
    sys.path.insert(0, str(ML_SRC))

from _shap_compat import ensure_shap_importable  # noqa: E402

from app.schemas import (  # noqa: E402
    Prediction,
    PatientInput,
    ShapBreakdown,
    ShapMap,
    Vessels,
)

log = logging.getLogger("app.service")

ARTIFACTS = REPO_ROOT / "ml" / "artifacts"
TARGETS = ("Cath", "LAD", "LCX", "RCA")


def build_row(payload: dict) -> pd.DataFrame:
    """One-patient DataFrame; Region RWMA arrives as '0'..'4' from the form
    but the encoder was fitted on ints, so coerce before the pipeline."""
    record = dict(payload)
    record["Region RWMA"] = int(record["Region RWMA"])
    return pd.DataFrame([record])


def build_feature_map(bundle: dict) -> dict[str, str]:
    """transformed column (81) -> original feature name (54): one-hot outputs
    like 'Sex_Male' collapse onto their parent column 'Sex'."""
    prep = bundle["pipeline"].named_steps["prep"]
    numeric = set(bundle["numeric_features"])
    cats = list(bundle["categorical_features"])
    mapping: dict[str, str] = {}
    for name in prep.get_feature_names_out():
        name = str(name)
        if name in numeric:
            mapping[name] = name
            continue
        parent = next((c for c in cats if name.startswith(f"{c}_")), None)
        mapping[name] = parent if parent is not None else name
    return mapping


class ModelService:
    def __init__(self) -> None:
        self._bundles: dict[str, dict] = {}
        self._maps: dict[str, dict[str, str]] = {}

    def load(self) -> None:
        ensure_shap_importable()
        for target in TARGETS:
            path = ARTIFACTS / f"{target}.joblib"
            if not path.exists():
                raise FileNotFoundError(
                    f"artifact missing: {path} — run: python ml/src/train.py"
                )
            self._bundles[target] = joblib.load(path)
            self._maps[target] = build_feature_map(self._bundles[target])
        log.info(
            "loaded %s (%s)",
            ", ".join(
                f"{t}={self._bundles[t]['selected_model']}"
                f"/{self._bundles[t]['shap_mode']}"
                for t in TARGETS
            ),
            ARTIFACTS,
        )

    def health(self) -> dict:
        return {
            "status": "ok",
            "targets": list(TARGETS),
            "models": {
                t: b["selected_model"] for t, b in self._bundles.items()
            },
            "shap_modes": {
                t: b["shap_mode"] for t, b in self._bundles.items()
            },
        }

    def predict(self, payload: PatientInput) -> Prediction:
        row = build_row(payload.model_dump(by_alias=True))
        proba = {t: self._score(t, row) for t in TARGETS}

        def label_of(target: str) -> str:
            bundle = self._bundles[target]
            if proba[target] >= bundle["threshold"]:
                return bundle["positive_label"]
            return bundle["negative_label"]

        shap_map = ShapMap(
            cad=self._breakdown("Cath", row, label_of("Cath")),
            LAD=self._breakdown("LAD", row, label_of("LAD")),
            LCX=self._breakdown("LCX", row, label_of("LCX")),
            RCA=self._breakdown("RCA", row, label_of("RCA")),
        )
        return Prediction(
            cad=proba["Cath"],
            vessels=Vessels(
                LAD=proba["LAD"], LCX=proba["LCX"], RCA=proba["RCA"]
            ),
            shap=shap_map,
        )

    def _features(self, target: str, row: pd.DataFrame) -> pd.DataFrame:
        return row[list(self._bundles[target]["feature_names"])]

    def _score(self, target: str, row: pd.DataFrame) -> float:
        bundle = self._bundles[target]
        X = self._features(target, row)
        return float(bundle["pipeline"].predict_proba(X)[0, 1])

    def _breakdown(
        self, target: str, row: pd.DataFrame, label: str
    ) -> ShapBreakdown:
        try:
            values = self._explain(target, row)
        except Exception:
            log.exception("SHAP failed for %s", target)
            return ShapBreakdown(contributions=[], label=label)
        return ShapBreakdown(contributions=values, label=label)

    def _explain(self, target: str, row: pd.DataFrame) -> list[dict]:
        bundle = self._bundles[target]
        prep = bundle["pipeline"].named_steps["prep"]
        X = self._features(target, row)
        Xt = prep.transform(X)

        sv = bundle["shap_explainer"].shap_values(Xt)
        if isinstance(sv, list):
            sv = sv[-1]
        sv = np.asarray(sv, dtype=float)
        if sv.ndim == 3:
            sv = sv[:, :, -1]
        if sv.ndim == 1:
            sv = sv.reshape(1, -1)

        mapping = self._maps[target]
        agg: dict[str, float] = {}
        for name, value in zip(prep.get_feature_names_out(), sv[0]):
            parent = mapping.get(str(name), str(name))
            agg[parent] = agg.get(parent, 0.0) + float(value)

        ranked = sorted(agg.items(), key=lambda kv: -abs(kv[1]))
        return [{"feature": k, "value": v} for k, v in ranked]
