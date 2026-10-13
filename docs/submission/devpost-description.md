# CardioScope — Interactive Cardiovascular Risk Exploration

## Inspiration

Clinical risk scores can be difficult to connect to anatomy. We wanted a
research workspace where a user can inspect a coronary vessel, see its predicted
risk, and understand which clinical features influenced the model.

## What it does

CardioScope estimates overall CAD probability and stenosis probabilities for
LAD, LCX, and RCA from 54 clinical inputs. It maps vessel probabilities onto an
interactive procedural 3D heart and pairs them with SHAP explanations and the
measurements used in each assessment.

Users can rotate, zoom, switch camera views, select vessels, toggle labels,
expand the viewer, and export an assessment through the browser's print dialog.
A camera-following anatomical compass keeps directions consistent during
rotation. Overall CAD uses likelihood labels, while vessel cards describe
predicted stenosis. Probabilities retain decimal precision rather than rounding
near-one outputs to an apparent 100% certainty.

## How we built it

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Zustand, Three.js,
  React Three Fiber, and Drei. Anatomy and textures are generated locally.
- **Backend:** FastAPI validates 54 allowed clinical features and serves four
  committed CatBoost classifiers with SHAP explanations.
- **Training:** scikit-learn pipelines, five stratified CV folds, seed 42,
  with LightGBM/XGBoost/CatBoost candidates and a logistic baseline.
- **Explainability:** selected models support SHAP in probability units, with
  one-hot contributions aggregated to original clinical features.

## Results

Recorded pooled out-of-fold results on the 303-record UCI Extension of
Z-Alizadeh Sani dataset (ID 411, CC BY 4.0):

| Target | ROC-AUC | F1 |
| --- | --- | --- |
| CAD / Cath | 0.912 | 0.900 |
| LAD | 0.849 | 0.819 |
| LCX | 0.739 | 0.617 |
| RCA | 0.703 | 0.507 |

These are research cross-validation results, not prospective clinical
validation. LCX and RCA remain the weaker targets. Full metrics, model versions,
thresholds, dataset provenance, and tests are included in the repository.

## Challenges and lessons

Keeping input schemas, model outputs, anatomical identifiers, and explanations
consistent mattered as much as the visuals. Tests exclude all target labels
from predictor inputs and verify API/frontend/schema parity. The app preserves
the measurements behind a score when the user begins editing another profile.
We also separated CAD wording from vessel terminology and made high probabilities
visible without misleading integer rounding.

## Run the project

The repository README provides complete Windows and macOS/Linux setup steps.
Run the local FastAPI service on port 8001 and Vite in a second terminal. The
trained models are included; users do not need to retrain before launching.
Pinned Python requirements and the npm lockfile record the verified environment.

Repository: https://github.com/vaibhavitej-a11y/CardioScope

## Next steps

Calibration assessment, external datasets, prospective validation, and imaging
inputs are future research directions. The current anatomy is illustrative;
the dataset does not support patient-specific lesion localization.

> For decision support / educational purposes only — not a substitute for formal diagnostic imaging.

---

Submission editor notes: enter the real demo-video URL in Devpost's video field
and add all four registered team members. Those details are intentionally not
invented here. See checklist.md before publishing.
