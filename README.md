# Cardio 3D Risk — Track A, Multimodal AI Hackathon 2026

Interactive 3D cardiovascular risk visualization and prediction.
Predicts overall CAD status and LAD/LCX/RCA stenosis probability,
then maps them onto an interactive 3D human anatomical model.

**For decision support / educational purposes only — not a substitute
for formal diagnostic imaging.**

## Structure

| Folder | Owner | Purpose |
|---|---|---|
| `ml/` | M1 | Training pipeline, model artifacts, leakage tests |
| `api/` | M2 | FastAPI prediction service |
| `web/` | M3 (`src/three`) · M4 (`src/components`) | React + React Three Fiber frontend |
| `docs/` | M4 | Requirements, decision record, submission documentation |

## Dataset

UCI *Extension of Z-Alizadeh Sani*, doi:10.24432/C5461K (CC BY 4.0).
303 patients × 59 features.

`LAD`, `LCX`, `RCA` and `Cath` are **excluded from model inputs** to
prevent target leakage — enforced by an automated unit test
(`ml/tests/test_leakage.py`).

## Run

_TBD — filled in Day 9._
