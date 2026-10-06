"""
Dataset loading and cleaning — Track A, requirement 1c/1d.

UCI 411 — *Extension of Z-Alizadeh Sani*, doi:10.24432/C5461K (CC BY 4.0).

Rules enforced here (problem statement §1d):
    LAD, LCX, RCA and Cath are NEVER model inputs — they are the answers.

`Region RWMA` is kept as a **feature** (§1 of the primer says it may be used
clinically) but is treated as a *categorical region label*, never as a pixel
or 3D anatomical coordinate.
"""
from __future__ import annotations

import hashlib
import sys
from pathlib import Path

import pandas as pd

RAW_PATH = (
    Path(__file__).resolve().parents[1]
    / "data"
    / "raw"
    / "extention of Z-Alizadeh sani dataset.xlsx"
)

# --- targets -------------------------------------------------------------
TARGETS: tuple[str, ...] = ("Cath", "LAD", "LCX", "RCA")

# What "positive" means for each target (the clinically relevant class).
POSITIVE_LABEL: dict[str, str] = {
    "Cath": "CAD",
    "LAD": "Stenotic",
    "LCX": "Stenotic",
    "RCA": "Stenotic",
}

NEGATIVE_LABEL: dict[str, str] = {
    "Cath": "Normal",
    "LAD": "Normal",
    "LCX": "Normal",
    "RCA": "Normal",
}

# --- known dataset quirks ------------------------------------------------
# Source column for the Sex field had a typo in the published file.
SEX_FIX: dict[str, str] = {"Fmale": "Female"}

# Single-value columns across all 303 patients: zero information, dropped.
DROP_CONSTANT: tuple[str, ...] = ("Exertional CP",)

# Numeric-looking columns that are really categories. Region RWMA is a
# region *label* (1-5), not a measurement — one-hot it.
CATEGORICAL_EXTRA: tuple[str, ...] = ("Region RWMA",)


def load_raw() -> pd.DataFrame:
    """Read the published .xlsx exactly as downloaded (unmodified)."""
    if not RAW_PATH.exists():
        raise FileNotFoundError(
            f"Dataset not found at {RAW_PATH}. "
            "It ships with this repo — re-clone if it is missing."
        )
    return pd.read_excel(RAW_PATH)


def dataset_sha256() -> str:
    """Content hash of the raw file, recorded in the manifest."""
    return hashlib.sha256(RAW_PATH.read_bytes()).hexdigest()


def clean(df: pd.DataFrame) -> pd.DataFrame:
    """Apply the minimal, documented corrections needed to train.

    Deliberately minimal: no imputation, no outlier removal, no feature
    engineering. Anything beyond these four lines belongs in a reviewed
    commit, not silently in a script.
    """
    out = df.copy()

    # 1. 'Fmale' -> 'Female'
    if "Sex" in out.columns:
        out["Sex"] = out["Sex"].replace(SEX_FIX)

    # 2. drop known single-value columns
    out = out.drop(columns=[c for c in DROP_CONSTANT if c in out.columns])

    # 3. targets must be present and complete
    missing = [t for t in TARGETS if t not in out.columns]
    if missing:
        raise ValueError(f"Dataset is missing target column(s): {missing}")

    # 4. no missing values anywhere (verified: 303 x 59, 0 missing)
    na = int(out.isna().sum().sum())
    if na:
        raise ValueError(f"Dataset contains {na} missing cells; handle explicitly.")

    return out


def feature_columns(df: pd.DataFrame) -> list[str]:
    """Every column except the four targets — and nothing else."""
    return [c for c in df.columns if c not in TARGETS]


def categorical_columns(df: pd.DataFrame) -> list[str]:
    cols = [c for c in feature_columns(df) if df[c].dtype == object]
    cols += [c for c in CATEGORICAL_EXTRA if c in feature_columns(df)]
    return sorted(set(cols))


def numeric_columns(df: pd.DataFrame) -> list[str]:
    return [c for c in feature_columns(df) if c not in categorical_columns(df)]


def encode_target(series: pd.Series, target: str) -> pd.Series:
    """Map the published labels to 1 = positive / 0 = negative."""
    pos, neg = POSITIVE_LABEL[target], NEGATIVE_LABEL[target]
    unknown = set(series.unique()) - {pos, neg}
    if unknown:
        raise ValueError(f"{target}: unexpected labels {unknown}")
    return (series == pos).astype(int)


def split(df: pd.DataFrame) -> tuple[pd.DataFrame, dict[str, pd.Series]]:
    """Return (X, y) where y is {target: 0/1 Series}."""
    X = df[feature_columns(df)].copy()
    y = {t: encode_target(df[t], t) for t in TARGETS}
    return X, y


def load() -> tuple[pd.DataFrame, dict[str, pd.Series]]:
    """clean() -> split(). The one call the training script needs."""
    return split(clean(load_raw()))


def validate_no_leakage(X: pd.DataFrame) -> list[str]:
    """Hard-fail if a target column sneaks into the features.

    Returns the list of offending columns (empty when clean). Raises
    nothing — the test suite decides what to do with it, so this helper
    can also be called at runtime by the training script.
    """
    return [c for c in TARGETS if c in X.columns]


if __name__ == "__main__":
    df = clean(load_raw())
    X, y = split(df)
    print(f"rows          {len(df)}")
    print(f"features      {X.shape[1]}")
    print(f"categorical   {len(categorical_columns(df))}")
    print(f"numeric       {len(numeric_columns(df))}")
    print(f"targets       {TARGETS}")
    print(f"leakage cols  {validate_no_leakage(X)}")
    for t in TARGETS:
        print(f"  {t:5} positive={int(y[t].sum()):3}  negative={int((y[t] == 0).sum()):3}")
    sys.exit(0)
