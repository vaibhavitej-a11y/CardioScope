"""
Target-leakage guard — Track A requirement 1d.

    "Exclude LAD, LCX, RCA, and Cath from model input features when
     predicting CAD or vessel-specific stenosis to prevent target leakage."

This test is the enforcement point. If it fails, the *feature* is wrong,
not the test.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

import data as data_mod  # noqa: E402

TARGETS = ("Cath", "LAD", "LCX", "RCA")
FORBIDDEN = set(TARGETS)


def _feature_frame():
    df = data_mod.clean(data_mod.load_raw())
    return data_mod.split(df)[0]


def test_raw_dataset_still_has_four_targets():
    df = data_mod.clean(data_mod.load_raw())
    for t in TARGETS:
        assert t in df.columns, f"target {t} missing from dataset"


def test_features_exclude_every_target():
    X = _feature_frame()
    leaked = FORBIDDEN.intersection(X.columns)
    assert not leaked, (
        f"TARGET LEAKAGE: {sorted(leaked)} present in model inputs. "
        "Per problem statement §1d these are the answers, never features."
    )


def test_feature_count_is_expected():
    """303 patients, 59 published columns - 4 targets - 1 constant = 54."""
    X = _feature_frame()
    assert X.shape[1] == 54, f"expected 54 features, got {X.shape[1]}"


def test_no_target_derived_feature_smuggling_a_target():
    """A renamed copy of a target is still leakage.

    Any feature that is a perfect (anti)correlation with a target label
    means the answer has been smuggled in under another name.
    """
    import pandas as pd

    df = data_mod.clean(data_mod.load_raw())
    X, y = data_mod.split(df)
    for t in TARGETS:
        target_vec = y[t]
        for col in X.columns:
            s = X[col]
            if s.dtype == object or s.nunique() > 2:
                continue
            binary = (s == s.dropna().unique()[0]).astype(int) if s.nunique() == 1 else s.astype(int)
            if pd.Series(binary).reset_index(drop=True).equals(target_vec.reset_index(drop=True)):
                raise AssertionError(
                    f"Feature '{col}' is identical to target '{t}' — leakage."
                )
            if pd.Series(1 - binary).reset_index(drop=True).equals(target_vec.reset_index(drop=True)):
                raise AssertionError(
                    f"Feature '{col}' is the exact inverse of target '{t}' — leakage."
                )


def test_training_script_features_match_this_list():
    """The schema written by the trainer must agree with this guard."""
    import json

    schema_path = Path(__file__).resolve().parents[1] / "artifacts" / "feature_schema.json"
    if not schema_path.exists():
        return  # schema not built yet — other tests still enforce the rule
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    leaked = FORBIDDEN.intersection(schema["feature_names"])
    assert not leaked, f"feature_schema.json contains targets: {sorted(leaked)}"
