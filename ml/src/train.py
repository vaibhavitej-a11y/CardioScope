"""
Training pipeline — Track A requirement 1a/1b/1e.

    1a  classify overall CAD status (target: Cath)
    1b  classify stenosis for LAD, LCX, RCA
    1c  use demographic / clinical / ECG / lab / echo features
    1d  LAD, LCX, RCA, Cath are NEVER inputs  ->  enforced in data.py
    1e  report accuracy, precision, recall, F1-score, ROC-AUC

Method
------
* 4 independent binary classifiers (one per target).
* 5-fold stratified cross-validation, seeded, shuffle=True.
* Three gradient-boosted candidates — LightGBM, XGBoost, CatBoost — are
  compared per target and the best ROC-AUC is selected and shipped.
  A logistic-regression model is trained too, purely as a reported
  baseline (it is not a candidate: requirement 3b asks for SHAP, and
  TreeExplainer needs a tree model).
* Metrics are reported two ways: mean +/- std over the 5 folds, and the
  pooled out-of-fold score (every patient predicted exactly once).
* The selected model is refitted on all 303 rows, explained with SHAP,
  and saved with joblib.

Run:  python ml/src/train.py
"""
from __future__ import annotations

import json
import platform
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import shap
from catboost import CatBoostClassifier
from lightgbm import LGBMClassifier
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from xgboost import XGBClassifier

sys.path.insert(0, str(Path(__file__).resolve().parent))
import data as D  # noqa: E402

# ---------------------------------------------------------------- config --
SEED = 42
N_SPLITS = 5
ARTIFACTS = Path(__file__).resolve().parents[1] / "artifacts"
METRICS = ("accuracy", "precision", "recall", "f1", "roc_auc")
TREE_MODELS = ("lightgbm", "xgboost", "catboost")
BASELINE = "logreg"
TREE_CANDIDATES = TREE_MODELS  # what selection is allowed to pick


# --------------------------------------------------------------- helpers --
# Column roles are fixed for this dataset — resolve them once, not per fold.
_RAW_META = D.clean(D.load_raw())
NUMERIC_COLS = D.numeric_columns(_RAW_META)
CATEGORICAL_COLS = D.categorical_columns(_RAW_META)


def make_preprocessor(*, scale: bool) -> ColumnTransformer:
    num_steps: list = [("impute", SimpleImputer(strategy="median"))]
    if scale:
        num_steps.append(("scale", StandardScaler()))
    return ColumnTransformer(
        transformers=[
            ("num", Pipeline(num_steps), NUMERIC_COLS),
            (
                "cat",
                Pipeline(
                    [
                        ("impute", SimpleImputer(strategy="most_frequent")),
                        (
                            "onehot",
                            OneHotEncoder(
                                handle_unknown="ignore",
                                sparse_output=False,
                            ),
                        ),
                    ]
                ),
                CATEGORICAL_COLS,
            ),
        ],
        verbose_feature_names_out=False,
    )


def build_models(y_train: pd.Series) -> dict[str, Pipeline]:
    """Fresh estimators for one CV fold.

    Class weights are computed from THIS fold's training split only, so no
    information from the validation fold leaks into the fit.
    """
    n_pos = int((y_train == 1).sum())
    n_neg = int((y_train == 0).sum())
    spw = (n_neg / n_pos) if n_pos else 1.0

    return {
        "lightgbm": Pipeline(
            [
                ("prep", make_preprocessor(scale=False)),
                (
                    "clf",
                    LGBMClassifier(
                        n_estimators=400,
                        learning_rate=0.05,
                        num_leaves=31,
                        min_child_samples=10,
                        subsample=0.9,
                        colsample_bytree=0.9,
                        reg_lambda=1.0,
                        class_weight="balanced",
                        random_state=SEED,
                        n_jobs=4,
                        verbose=-1,
                    ),
                ),
            ]
        ),
        "xgboost": Pipeline(
            [
                ("prep", make_preprocessor(scale=False)),
                (
                    "clf",
                    XGBClassifier(
                        n_estimators=400,
                        learning_rate=0.05,
                        max_depth=4,
                        subsample=0.9,
                        colsample_bytree=0.9,
                        min_child_weight=1,
                        reg_lambda=1.0,
                        scale_pos_weight=spw,
                        random_state=SEED,
                        n_jobs=4,
                        eval_metric="logloss",
                        tree_method="hist",
                    ),
                ),
            ]
        ),
        "catboost": Pipeline(
            [
                ("prep", make_preprocessor(scale=False)),
                (
                    "clf",
                    CatBoostClassifier(
                        iterations=400,
                        learning_rate=0.05,
                        depth=5,
                        l2_leaf_reg=3.0,
                        random_seed=SEED,
                        auto_class_weights="Balanced",
                        allow_writing_files=False,
                        verbose=0,
                    ),
                ),
            ]
        ),
        BASELINE: Pipeline(
            [
                ("prep", make_preprocessor(scale=True)),
                (
                    "clf",
                    LogisticRegression(
                        max_iter=2000,
                        class_weight="balanced",
                        random_state=SEED,
                    ),
                ),
            ]
        ),
    }


def score(y_true: np.ndarray, p: np.ndarray, threshold: float = 0.5) -> dict[str, float]:
    """Requirement 1e: accuracy, precision, recall, F1, ROC-AUC."""
    pred = (p >= threshold).astype(int)
    return {
        "accuracy": float(accuracy_score(y_true, pred)),
        "precision": float(precision_score(y_true, pred, zero_division=0)),
        "recall": float(recall_score(y_true, pred, zero_division=0)),
        "f1": float(f1_score(y_true, pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_true, p)),
    }


def best_threshold(y_true: np.ndarray, p: np.ndarray) -> float:
    """Operating point that maximises F1, ties broken toward 0.5.

    Class-weighted models do not emit calibrated 0.5-split probabilities, so
    a fixed 0.5 threshold needlessly sacrifices recall. The threshold is
    chosen on cross-validated predictions, never on the data it is applied to.
    """
    grid = np.round(np.linspace(0.05, 0.95, 91), 4)
    best_t, best_v = 0.5, -1.0
    for t in grid:
        v = f1_score(y_true, (p >= t).astype(int), zero_division=0)
        if v > best_v + 1e-9:
            best_v, best_t = float(v), float(t)
        elif abs(v - best_v) <= 1e-9 and abs(t - 0.5) < abs(best_t - 0.5):
            best_t = float(t)
    return best_t


def inner_threshold(X_tr: pd.DataFrame, y_tr: pd.Series, model_name: str) -> float:
    """Pick a threshold using 3-fold CV *inside* one outer training split."""
    inner = StratifiedKFold(n_splits=3, shuffle=True, random_state=SEED)
    p = np.zeros(len(y_tr), dtype=float)
    for itr, iva in inner.split(X_tr, y_tr):
        m = build_models(y_tr.iloc[itr])[model_name]
        m.fit(X_tr.iloc[itr], y_tr.iloc[itr])
        p[iva] = m.predict_proba(X_tr.iloc[iva])[:, 1]
    return best_threshold(y_tr.values, p)


def agg(rows: list[dict[str, float]]) -> dict[str, dict[str, float]]:
    return {
        m: {
            "mean": float(np.mean([r[m] for r in rows])),
            "std": float(np.std([r[m] for r in rows])),
            "folds": [round(r[m], 6) for r in rows],
        }
        for m in METRICS
    }


# ------------------------------------------------------------ one target --
def train_target(
    X: pd.DataFrame, y: pd.Series, target: str, verbose: bool = True
) -> dict:
    cv = StratifiedKFold(n_splits=N_SPLITS, shuffle=True, random_state=SEED)
    fold_scores: dict[str, list[dict[str, float]]] = {}
    oof: dict[str, np.ndarray] = {}

    for tr, va in cv.split(X, y):
        y_tr = y.iloc[tr]
        for name, pipe in build_models(y_tr).items():
            pipe.fit(X.iloc[tr], y_tr)
            p = pipe.predict_proba(X.iloc[va])[:, 1]
            fold_scores.setdefault(name, []).append(score(y.iloc[va].values, p))
            oof.setdefault(name, np.zeros(len(y), dtype=float))
            oof[name][va] = p

    # fold summary
    candidates = {
        name: {
            **{m: {"mean": agg(rows)[m]["mean"], "std": agg(rows)[m]["std"]} for m in METRICS},
            "oof": score(y.values, oof[name]),
        }
        for name, rows in fold_scores.items()
    }

    # selection: best mean ROC-AUC among the deployable tree models
    selected = max(
        TREE_CANDIDATES, key=lambda n: candidates[n]["roc_auc"]["mean"]
    )

    # --- operating point for the shipped model --------------------------
    # Threshold is chosen on an INNER 3-fold CV of each outer training split,
    # then applied to that outer split's untouched validation predictions.
    # The validation fold never influences its own threshold.
    splits = list(cv.split(X, y))
    tuned_rows: list[dict[str, float]] = []
    fold_thresholds: list[float] = []
    per_row_threshold = np.full(len(y), 0.5, dtype=float)
    for (tr, va), t in zip(splits, [inner_threshold(X.iloc[tr], y.iloc[tr], selected)
                                    for tr, va in splits]):
        fold_thresholds.append(t)
        per_row_threshold[va] = t
        tuned_rows.append(
            score(y.iloc[va].values, oof[selected][va], threshold=t)
        )

    # production threshold: maximise F1 over the pooled out-of-fold
    # predictions of the selected model (this is what the API ships)
    prod_threshold = best_threshold(y.values, oof[selected])

    # pooled OOF, each patient scored with the threshold belonging to the
    # fold it was held out in — consistent with the per-fold numbers above
    pred_tuned = (oof[selected] >= per_row_threshold).astype(int)
    oof_tuned = {
        "accuracy": float(accuracy_score(y.values, pred_tuned)),
        "precision": float(precision_score(y.values, pred_tuned, zero_division=0)),
        "recall": float(recall_score(y.values, pred_tuned, zero_division=0)),
        "f1": float(f1_score(y.values, pred_tuned, zero_division=0)),
        "roc_auc": float(roc_auc_score(y.values, oof[selected])),
    }

    candidates[selected]["threshold_tuned"] = agg(tuned_rows)
    candidates[selected]["oof_threshold_tuned"] = oof_tuned
    candidates[selected]["thresholds_per_fold"] = [round(t, 4) for t in fold_thresholds]

    # refit the winner on all 303 rows
    final = build_models(y)[selected]
    final.fit(X, y)

    if verbose:
        print(f"\n  {target}")
        for name in (*TREE_MODELS, BASELINE):
            c = candidates[name]
            star = "  <== SELECTED" if name == selected else ""
            print(
                f"    {name:9} roc_auc={c['roc_auc']['mean']:.3f}"
                f"+-{c['roc_auc']['std']:.3f}"
                f"  f1={c['f1']['mean']:.3f}"
                f"  recall={c['recall']['mean']:.3f}"
                f"  acc={c['accuracy']['mean']:.3f}{star}"
            )
        t = candidates[selected]["oof_threshold_tuned"]
        print(
            f"    {'@ tuned':9} threshold={prod_threshold:.2f}"
            f" (folds {[round(x, 2) for x in fold_thresholds]})"
            f"  f1={t['f1']:.3f}"
            f"  precision={t['precision']:.3f}"
            f"  recall={t['recall']:.3f}"
            f"  acc={t['accuracy']:.3f}"
        )

    return {
        "target": target,
        "positive_label": D.POSITIVE_LABEL[target],
        "n_positive": int(y.sum()),
        "n_negative": int((y == 0).sum()),
        "selected": selected,
        "threshold": round(prod_threshold, 4),
        "thresholds_per_fold": [round(t, 4) for t in fold_thresholds],
        "candidates": candidates,
        "cv": agg(fold_scores[selected]),
        "pipeline": final,
    }


# -------------------------------------------------------------------- SHAP --
def _normalise(sv, n_features: int) -> np.ndarray:
    """Coerce whatever shap returns into (n_samples, n_features)."""
    if isinstance(sv, list):                      # some versions return per-class
        sv = sv[-1]
    sv = np.asarray(sv, dtype=float)
    if sv.ndim == 3:                              # (n, features, classes)
        sv = sv[:, :, -1]
    if sv.ndim != 2 or sv.shape[1] != n_features:
        raise ValueError(f"unexpected SHAP shape {sv.shape}")
    return sv


def build_shap(pipe: Pipeline, X: pd.DataFrame) -> tuple[object | None, dict]:
    """SHAP TreeExplainer for requirement 3b.

    Two attempts, in order:

    1. interventional / probability mode — contributions are in probability
       units, which is what the dashboard shows clinicians.
    2. plain raw-output explainer — always available for tree models, but
       contributions are on the model's raw (log-odds) scale.

    XGBoost refuses mode 1 on this build, so the fallback is not optional:
    every target must end up with a working explainer.
    """
    prep = pipe.named_steps["prep"]
    clf = pipe.named_steps["clf"]
    Xt = prep.transform(X)
    names = list(prep.get_feature_names_out())

    attempts: list[tuple[str, object]] = []
    background = shap.sample(Xt, min(50, len(Xt)), random_state=SEED)
    attempts.append(
        (
            "interventional_probability",
            lambda: shap.TreeExplainer(
                clf,
                data=background,
                model_output="probability",
                feature_perturbation="interventional",
            ),
        )
    )
    attempts.append(("raw", lambda: shap.TreeExplainer(clf)))

    errors: list[str] = []
    for mode, factory in attempts:
        try:
            explainer = factory()
            sv = _normalise(explainer.shap_values(Xt), len(names))
            summary = {
                n: float(v)
                for n, v in sorted(
                    zip(names, np.abs(sv).mean(axis=0)), key=lambda kv: -kv[1]
                )
            }
            return explainer, {"shap_mode": mode, "shap_mean_abs": summary}
        except Exception as exc:
            errors.append(f"{mode}: {type(exc).__name__}: {exc}")

    return None, {
        "shap_mode": "failed",
        "shap_mean_abs": {},
        "shap_errors": errors,
    }


# ------------------------------------------------------------------ write --
def git_commit() -> str | None:
    try:
        return (
            subprocess.run(
                ["git", "rev-parse", "--short", "HEAD"],
                cwd=Path(__file__).resolve().parents[2],
                capture_output=True,
                text=True,
                timeout=10,
            ).stdout.strip()
            or None
        )
    except Exception:
        return None


def main() -> int:
    t0 = time.time()
    ARTIFACTS.mkdir(parents=True, exist_ok=True)

    raw = D.clean(D.load_raw())
    X, y = D.split(raw)

    leaked = D.validate_no_leakage(X)
    if leaked:
        raise SystemExit(f"FATAL: target leakage in features: {leaked}")

    feature_names = list(X.columns)
    cat_cols = D.categorical_columns(raw)
    num_cols = D.numeric_columns(raw)

    print("=" * 74)
    print("CardioScope — Track A predictive pipeline  (requirements 1a-1e)")
    print("=" * 74)
    print(f"rows {len(X)}  features {len(feature_names)} "
          f"({len(num_cols)} numeric, {len(cat_cols)} categorical)")
    print(f"targets {D.TARGETS}   seed {SEED}   {N_SPLITS}-fold stratified CV")

    results, shap_reports = {}, {}
    for target in D.TARGETS:
        res = train_target(X, y[target], target)
        print(f"    -> SHAP ...", end="", flush=True)
        explainer, report = build_shap(res["pipeline"], X)
        print(f" {report['shap_mode']}  "
              f"({len(report['shap_mean_abs'])} features ranked)")
        shap_reports[target] = report

        bundle = {
            "target": target,
            "positive_label": D.POSITIVE_LABEL[target],
            "negative_label": D.NEGATIVE_LABEL[target],
            "selected_model": res["selected"],
            "threshold": res["threshold"],
            "thresholds_per_fold": res["thresholds_per_fold"],
            "cv": res["cv"],
            "candidates": res["candidates"],
            "feature_names": feature_names,
            "numeric_features": num_cols,
            "categorical_features": cat_cols,
            "pipeline": res["pipeline"],
            "shap_explainer": explainer,
            "shap_mean_abs": report["shap_mean_abs"],
            "shap_mode": report["shap_mode"],
            "seed": SEED,
        }
        path = ARTIFACTS / f"{target}.joblib"
        joblib.dump(bundle, path)
        print(f"    saved {path.name}  ({path.stat().st_size // 1024} KB)")
        results[target] = res

    # ---------------------------------------------------------- metrics --
    metrics = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "seed": SEED,
        "n_splits": N_SPLITS,
        "cv_strategy": "StratifiedKFold(n_splits=5, shuffle=True)",
        "n_rows": int(len(X)),
        "selection_metric": "roc_auc",
        "selection_pool": list(TREE_CANDIDATES),
        "baseline_model": BASELINE,
        "baseline_note": (
            "Logistic regression is reported for context only; it is not a "
            "selection candidate because requirement 3b needs SHAP and "
            "TreeExplainer requires a tree model."
        ),
        "threshold_note": (
            "Candidate rows are scored at the default 0.5 threshold so they "
            "are comparable. The shipped model also reports "
            "'threshold_tuned' / 'oof_threshold_tuned', where the operating "
            "point is chosen on an inner 3-fold CV of each outer training "
            "split — the validation fold never influences its own threshold. "
            "'threshold' is the production cut-off (max F1 on pooled OOF)."
        ),
        "validation_note": (
            "No held-out test set: n=303 is too small to spare rows. "
            "'cv' is mean+/-std over the 5 folds; 'oof' pools all 303 "
            "out-of-fold predictions (each patient predicted exactly once)."
        ),
        "targets": {},
    }
    for target, res in results.items():
        sel = res["candidates"][res["selected"]]
        metrics["targets"][target] = {
            "positive_label": res["positive_label"],
            "n_positive": res["n_positive"],
            "n_negative": res["n_negative"],
            "selected": res["selected"],
            "threshold": res["threshold"],
            "thresholds_per_fold": res["thresholds_per_fold"],
            "cv": res["cv"],
            "oof": {m: sel["oof"][m] for m in METRICS},
            "oof_threshold_tuned": sel["oof_threshold_tuned"],
            "cv_threshold_tuned": sel.get("threshold_tuned"),
            "candidates": {
                n: {m: c[m] for m in METRICS} for n, c in res["candidates"].items()
            },
        }
    (ARTIFACTS / "metrics.json").write_text(
        json.dumps(metrics, indent=2), encoding="utf-8"
    )

    # ---------------------------------------------------------- schema ---
    schema = {
        "version": 1,
        "generated_at": metrics["generated_at"],
        "n_rows": int(len(X)),
        "n_features": len(feature_names),
        "feature_names": feature_names,
        "numeric_features": {
            c: {
                "min": float(raw[c].min()),
                "max": float(raw[c].max()),
                "mean": float(raw[c].mean()),
                "std": float(raw[c].std()),
            }
            for c in num_cols
        },
        "categorical_features": {
            c: sorted(str(v) for v in raw[c].unique()) for c in cat_cols
        },
        "targets": list(D.TARGETS),
        "positive_labels": dict(D.POSITIVE_LABEL),
        "dropped_constant_columns": list(D.DROP_CONSTANT),
        "dataset_sha256": D.dataset_sha256(),
        "dataset_doi": "10.24432/C5461K",
        "license": "CC BY 4.0",
        "leakage_guard": "LAD, LCX, RCA, Cath are excluded by construction",
    }
    (ARTIFACTS / "feature_schema.json").write_text(
        json.dumps(schema, indent=2), encoding="utf-8"
    )

    # ------------------------------------------------- SHAP summary file --
    (ARTIFACTS / "shap_summary.json").write_text(
        json.dumps(shap_reports, indent=2), encoding="utf-8"
    )

    # --------------------------------------------------------- manifest ---
    manifest = {
        "generated_at": metrics["generated_at"],
        "elapsed_seconds": round(time.time() - t0, 1),
        "git_commit": git_commit(),
        "python": platform.python_version(),
        "platform": platform.platform(),
        "versions": {
            pkg: _version(pkg)
            for pkg in (
                "numpy", "pandas", "scikit-learn", "lightgbm",
                "xgboost", "catboost", "shap", "joblib",
            )
        },
        "dataset_sha256": D.dataset_sha256(),
        "artifacts": sorted(p.name for p in ARTIFACTS.glob("*.joblib")),
    }
    (ARTIFACTS / "manifest.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8"
    )

    print("\n" + "=" * 74)
    hdr = f"{'TARGET':<7}{'SELECTED':<11}{'ROC-AUC':<9}{'F1':<8}{'PREC':<8}{'RECALL':<9}{'ACC'}"
    print(hdr)
    print("-" * 74)
    for t in D.TARGETS:
        s = metrics["targets"][t]
        o = s["oof"]                      # default 0.5 threshold
        print(
            f"{t:<7}{s['selected']:<11}{o['roc_auc']:<9.3f}{o['f1']:<8.3f}"
            f"{o['precision']:<8.3f}{o['recall']:<9.3f}{o['accuracy']:.3f}   (thr 0.50)"
        )
    print("-" * 74)
    print("same models at the inner-CV selected operating point:")
    for t in D.TARGETS:
        s = metrics["targets"][t]
        o = s["oof_threshold_tuned"]
        print(
            f"{t:<7}{s['selected']:<11}{o['roc_auc']:<9.3f}{o['f1']:<8.3f}"
            f"{o['precision']:<8.3f}{o['recall']:<9.3f}{o['accuracy']:.3f}"
            f"   (thr {s['threshold']:.2f})"
        )
    print("=" * 74)
    print(f"artifacts -> {ARTIFACTS}")
    print(f"elapsed   {time.time() - t0:.1f}s")
    return 0


def _version(pkg: str) -> str:
    try:
        from importlib.metadata import version

        return version(pkg)
    except Exception:
        return "unknown"


if __name__ == "__main__":
    raise SystemExit(main())
