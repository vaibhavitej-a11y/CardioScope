# CardioScope
<p align="center">
  <strong>Explore heart disease risk visually, with an interactive 3D heart and explanations behind each model prediction.</strong>
</p>

<p align="center">
  <a href="https://cardioscope-31m4.onrender.com/">Live Demo</a> ·
  <a href="docs/submission/index.pdf">Technical Report</a> ·
  <a href="docs/submission/devpost-description.md">Devpost Description</a>
</p>

CardioScope is a research web application built for Track A of the Multimodal AI
Hackathon 2026. Enter a patient's clinical measurements to estimate overall
coronary artery disease (CAD) probability and stenosis probability for three
major coronary vessels: LAD, LCX, and RCA. The dashboard maps those predictions
onto an interactive, beating 3D heart and explains the factors behind each score.

> For decision support / educational purposes only — not a substitute for formal diagnostic imaging.

![CardioScope: patient inputs, interactive heart, live risk scores, and SHAP explanations](docs/screenshots/workspace.png)

## What you can do

- Enter **54 clinical inputs**, organized into demographics, risk factors,
  comorbidities, examination, symptoms, ECG, laboratory, and echocardiography.
- Run the **real local prediction API**, powered by four shipped CatBoost models.
- Rotate and zoom the heart, switch anatomical camera views, toggle labels,
  enable automatic rotation, or expand the viewer.
- Select a vessel, node, label, or risk card to inspect its probability and
  **SHAP feature contributions**, paired with the measurements used in that assessment.
- Switch between risk mapping and anatomy, or optionally play a synthesized heartbeat.
- Export the assessment using the browser's print / Save as PDF dialog.

The heart is **illustrative procedural anatomy**, not a patient-specific scan.
Its branches do not locate individual lesions. Colors represent vessel-level
model probabilities, not measured stenosis severity.

## How it works

```text
54 clinical inputs → FastAPI → four trained models + SHAP explanations
                            ↓
              CAD / LAD / LCX / RCA probabilities
                            ↓
              React dashboard + interactive 3D heart
```

The frontend sends `POST /api/predict` through Vite's `/api` proxy. The API loads
the committed model bundles from `ml/artifacts/` at startup and returns four
probabilities plus an explanation for each target. Shared vessel identifiers
keep the cards, labels, arteries, and explanation panel synchronized.

**You need two running services: the frontend and the API. Training is optional;
the trained models are already included.** No database, Docker, cloud account,
API key, or external AI service is required.

## Prerequisites

| Tool | Recommended | Purpose |
| --- | --- | --- |
| Node.js | 24 LTS | Vite frontend; npm is included |
| Python | 3.13 | Prediction API and model runtime |
| Git | Recent version | Clone and contribute |
| Browser | Current Chrome, Edge, or Firefox with WebGL | Interactive 3D viewer |

The shipped model manifest records Python **3.13.14**, NumPy **2.5.1**,
scikit-learn **1.9.0**, CatBoost **1.2.10**, and SHAP **0.52.0**. Use a dedicated
virtual environment; serialized models may be incompatible with older packages.
See [the manifest](ml/artifacts/manifest.json) for the full training environment.

Python requirements and their project dependency closure are pinned in
`constraints.txt`; the npm dependency tree is recorded in `web/package-lock.json`.
Update those files deliberately and rerun model-loading tests when changing versions.

## Quick start (Windows)

Run these commands from the repository root. If the project is already on your
machine, open a terminal in that folder and skip cloning.

### 1. Install dependencies once

```powershell
git clone https://github.com/vaibhavitej-a11y/CardioScope.git
cd CardioScope

# Confirm that this Python is 3.13 before creating the environment.
python --version
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt

# Install the exact frontend dependency versions from the lockfile.
npm.cmd --prefix web ci
```

Using `.venv\Scripts\python.exe` directly avoids activation-policy problems and
keeps installation and serving on the same Python interpreter. If `python`
points to another installation, use the full path to Python 3.13 for the
`-m venv .venv` command. Do not install packages into one Python and serve the
API with another.

### 2. Terminal A: start the prediction API

From the repository root:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir api --host 127.0.0.1 --port 8001
```

Wait for **Application startup complete**. The API loads four models and their
explainers before it begins accepting requests.

If you already have a suitable Python installation and want the helper to find it:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-api.ps1
```

The helper checks the project `.venv`, a standard local Python 3.13 installation,
and then PATH for the required packages and model versions. It runs in the foreground: keep that
terminal open, and press `Ctrl+C` to stop it.

### 3. Terminal B: start the frontend

Open a second terminal at the repository root:

```powershell
npm.cmd --prefix web run dev
```

Open **http://localhost:5173**, acknowledge the research notice, and look for
**Model connected** in the header. Vite prints a different port if 5173 is busy;
use the URL shown in that terminal.

### 4. Verify the connection

```powershell
Invoke-RestMethod http://127.0.0.1:8001/api/health
```

The response should contain `status: ok` and models for `Cath`, `LAD`, `LCX`, and
`RCA`. You can also check `http://localhost:5173/api/health` to verify the frontend
proxy. Change clinical inputs and click **Run assessment**: the risk readouts,
vessel colors, and explanation should update together.

## Quick start (macOS / Linux)

From the repository root, with Python 3.13 installed:

```bash
python3.13 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
npm --prefix web ci
```

Terminal A:

```bash
.venv/bin/python -m uvicorn app.main:app --app-dir api --host 127.0.0.1 --port 8001
```

Terminal B:

```bash
npm --prefix web run dev
```

Open the URL printed by Vite, normally **http://localhost:5173**. The Windows
helper is optional; the direct Uvicorn command is the portable serving path.

## Reading the assessment

The initial form is a **cohort-default example, not a healthy patient**. In
particular, its prefilled findings include hypertension and typical chest pain.
Those values can produce a high CAD prediction. Replace them with the actual
profile you intend to explore and rerun the assessment.

Probabilities display one decimal place. For example, **99.68% displays as
99.7%**, rather than rounding to 100%. Extremely small or large probabilities
display as `<0.1%` or `>99.9%` instead of implying absolute certainty.

| Display band | Probability | Meaning in this visualization |
| --- | --- | --- |
| Green | ≤25% | Predicted normal band |
| Amber | >25% and <75% | Uncertain band |
| Red | ≥75% | Predicted stenotic band |

The vessel colors interpolate between those anchors. These are visualization
bands, not validated clinical decision thresholds. The API also returns
model-specific classification labels based on the stored operating thresholds.
The overall card uses **Lower / Uncertain / Higher CAD likelihood**, while
stenosis wording is reserved for the individual coronary vessels. The anatomical
compass rotates with the camera: L/R, S/I, and A/P indicate patient-space directions.

Positive SHAP contributions raise a model's predicted probability; negative
contributions lower it. They describe model attribution, **not causation**.
The dashboard shows the top five factors and the sum of those displayed factors;
that sum excludes the model baseline and the remaining features.

Editing the form marks the current results as **Inputs changed**. Until you run
another assessment, explanations retain the measurements used for the previous
prediction so they do not silently mix old scores with new inputs.

If the API is unavailable, the app offers **Explore a sample assessment**. This
is an explicitly labeled, canned preview. It does not calculate a new prediction
from edited inputs. Start the API and run an assessment to return to real results.

## Build, preview, and check

Run these commands from the repository root:

```powershell
npm.cmd --prefix web run lint
npm.cmd --prefix web test
npm.cmd --prefix web run build
.\.venv\Scripts\python.exe -m pytest api/tests ml/tests -q
```

To review the production frontend build locally:

```powershell
npm.cmd --prefix web run preview
```

Open the preview URL printed by Vite, normally **http://localhost:4173**.
**Keep the API running on port 8001.** Both development and preview proxy `/api`
to that service. Vite preview is for local review, not a production application
server. A hosted deployment must serve the frontend and route `/api` to FastAPI.

On macOS/Linux, use `npm` instead of `npm.cmd` and `.venv/bin/python` instead of
`.venv\Scripts\python.exe`. Tests cover API contracts, input boundaries, feature
schema/disclaimer parity, target leakage, model artifacts, and SHAP consistency.

## Dataset and model evaluation

The included dataset is the UCI **Extension of Z-Alizadeh Sani dataset**,
[DOI: 10.24432/C5461K](https://doi.org/10.24432/C5461K): **303 records, 59 original
columns**. Four targets and one constant column are excluded, leaving 54 model
inputs. `Cath`, `LAD`, `LCX`, and `RCA` are never supplied as predictor inputs.

The unmodified workbook is committed at
`ml/data/raw/extention of Z-Alizadeh sani dataset.xlsx`. Attribution: Z-Alizadeh
Sani et al., via the UCI Machine Learning Repository, licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

Recorded pooled out-of-fold results, using five stratified folds and seed 42:

| Target | Model | ROC-AUC | F1 | Precision | Recall | Accuracy |
| --- | --- | --- | --- | --- | --- | --- |
| Overall CAD (`Cath`) | CatBoost | 0.912 | 0.900 | 0.887 | 0.912 | 0.855 |
| LAD | CatBoost | 0.849 | 0.819 | 0.797 | 0.842 | 0.782 |
| LCX | CatBoost | 0.739 | 0.617 | 0.640 | 0.597 | 0.710 |
| RCA | CatBoost | 0.703 | 0.507 | 0.558 | 0.465 | 0.660 |

These results describe the recorded research evaluation, not prospective
clinical validation. The dataset is small; LCX and RCA performance is weaker
than CAD/LAD, and a high score does not establish calibrated clinical certainty.
Full fold statistics, operating thresholds, and model-selection details are in
[metrics.json](ml/artifacts/metrics.json). All shipped explanations use
`interventional_probability`, keeping contribution units consistent across targets.

### Optional: retrain the models

Training is **not required to run the app**. To regenerate model bundles and
evaluation artifacts, stop the API first, then run:

```powershell
.\.venv\Scripts\python.exe ml/src/train.py
```

This rewrites `ml/artifacts/`. Review those changes and rerun the tests before
committing them. Restart the API afterward to load the new bundles.

## Project structure

```text
api/                 FastAPI routes, validation, model serving, and API tests
ml/
  artifacts/         Four trained models, schemas, metrics, and provenance
  data/raw/          Original public research workbook
  src/               Data preparation, training, and SHAP compatibility
  tests/             Leakage and model artifact checks
web/
  src/api/           Typed API client, 54-feature catalogue, and sample data
  src/components/    Patient form, risk dashboard, explanations, and notices
  src/store/         Shared patient, assessment, and vessel-selection state
  src/three/         Procedural heart, vessels, materials, and camera controls
docs/                Requirements, design decisions, and submission material
start-api.ps1        Windows helper for selecting a suitable Python runtime
requirements.txt     Shared Python dependencies for API, training, and tests
```

Frontend stack: **React 19, TypeScript, Vite 8, Tailwind CSS 4, Zustand, Three.js,
React Three Fiber, and Drei**. Backend stack: **FastAPI, Pydantic, CatBoost,
scikit-learn, and SHAP**. See [web/README.md](web/README.md) for frontend details.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| “Prediction service unavailable” / HTTP 502 | Start the API, wait for startup completion, and check `/api/health`. Keep both terminals running. |
| `ModuleNotFoundError` for CatBoost or SHAP | Use the same `.venv` interpreter for installation and Uvicorn, or run `start-api.ps1`. The default `python` may be another installation. |
| PowerShell blocks `npm.ps1` | Use `npm.cmd`, as in the Windows commands above. |
| Port already in use | Check the owning process. Reuse the intended server or stop it with `Ctrl+C`; use the frontend URL Vite prints. |
| CAD looks close to 100% | Check the input findings, especially chest pain, hypertension, age, and ejection fraction. Cohort defaults are not a healthy profile. Rerun after edits. |
| Model bundles cannot load | Confirm all four `.joblib` files are present and use compatible packages; the manifest records training versions. |
| `llvmlite.dll` is blocked on Windows | The API includes a numba-import compatibility fallback for SHAP. Use the normal API entry point so that fallback runs before unpickling. |
| 3D view is unavailable | Enable browser hardware acceleration and WebGL. Predictions and form controls remain available if the viewer cannot initialize. |
| Preview has no API results | Start FastAPI on 8001 as well as the preview server. A frontend build does not contain the Python backend. |

## Before pushing changes

### Deploy the frontend

For a hosted prototype with **real predictions**, use the
[full-stack deployment](deploy/README.md). The root Dockerfile builds React and
serves it from FastAPI alongside all four trained models. `render.yaml` provides
a single-service hosting configuration; `deploy/verify.py` checks actual
input-dependent predictions and SHAP over HTTP. This is the primary deployment
path. See the [requirement audit](docs/requirements-audit.md) for verified and
outstanding challenge deliverables.

The repository includes a Sites hosting manifest at `.openai/hosting.json`
that serves the root `dist/`. Run `npm --prefix web run build:deploy` before
packaging a deployment. See [frontend deployment](web/README.md#frontend-deployment)
for other static hosts and the optional `VITE_API_BASE_URL` setting.

A frontend-only deployment provides the 3D workspace and an explicitly selected
sample assessment. Real predictions require a separately hosted Python API;
the local development proxy is not included in the static build.

### Push checks

Run the build, lint, and Python tests above, then inspect `git status --short`
and `git diff --check`. Commit source, documentation, the npm lockfile, model
artifacts, and the attributed public workbook. Local dependencies, virtualenvs,
build output, caches, logs, and environment secrets are ignored.

Repository: [github.com/vaibhavitej-a11y/CardioScope](https://github.com/vaibhavitej-a11y/CardioScope).
Submission documentation and the demo script live in [docs/](docs/).

### Submission package

- [Six-page technical report](docs/submission/index.pdf)
- [Report source](docs/submission/index.md)
- [Devpost description](docs/submission/devpost-description.md)
- [Final submission checklist](docs/submission/checklist.md)

To regenerate the PDF after editing its Markdown source:

```powershell
.\.venv\Scripts\python.exe -m pip install -r docs/requirements.txt
.\.venv\Scripts\python.exe docs/submission/build_pdf.py
```

Publishing the repository, uploading the demo video, and entering team details
on Devpost are separate submission steps. The checklist records those items
without treating them as completed.

## Documentation
For setup, troubleshooting, model evaluation, and deployment instructions, refer to the sections above.
