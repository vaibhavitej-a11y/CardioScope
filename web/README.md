# CardioScope frontend

The React application for CardioScope's clinical research workspace. It collects
54 clinical inputs, sends them to the prediction API, and displays overall CAD
and LAD/LCX/RCA probabilities alongside an interactive 3D heart and SHAP explanations.

## Run locally

Use Node.js 24 LTS. From this directory:

```powershell
npm.cmd ci
npm.cmd run dev
```

Open the URL Vite prints, normally **http://localhost:5173**. On macOS/Linux,
use `npm` instead of `npm.cmd`.

**The frontend needs the prediction API to calculate real assessments.**
In a second terminal, from the repository root:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir api --host 127.0.0.1 --port 8001
```

Alternatively, on Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-api.ps1
```

See the [root README](../README.md#quick-start-windows) for Python installation,
virtualenv setup, dependencies, and macOS/Linux commands. The pretrained models
are committed; retraining is not part of normal startup.

## Confirm it is connected

- `http://127.0.0.1:8001/api/health` checks the model service.
- `http://localhost:5173/api/health` checks the frontend's proxy to it.
- **Model connected** appears after a successful real prediction.
- Edit a profile and press **Run assessment** to refresh scores and explanations.

If the API is offline, **Explore a sample assessment** loads clearly labeled,
canned data. That sample does not run an ML model on edited inputs. The initial
cohort defaults include hypertension and typical chest pain, so they should not
be interpreted as a healthy reference patient.

## Commands

| Command | Purpose |
| --- | --- |
| `npm.cmd ci` | Install versions recorded in `package-lock.json` |
| `npm.cmd run dev` | Start the development server |
| `npm.cmd run lint` | Check source with Oxlint |
| `npm.cmd test` | Check probability precision, rounding boundaries, and CAD/vessel wording |
| `npm.cmd run build` | Type-check and create `dist/` |
| `npm.cmd run preview` | Review the production build, normally on port 4173 |

Keep the API running during development **and** preview. Both modes forward
`/api` to `http://127.0.0.1:8001` via [vite.config.ts](vite.config.ts). A deployed
site needs an equivalent route to its Python API; static hosting alone cannot
run the models. No environment variables or API keys are needed locally.

## Frontend deployment

Use the [full-stack Docker/Render deployment](../deploy/README.md) for the working
prototype with real model predictions. FastAPI serves this frontend and the API
from one origin. The static-only option below is optional.

The Sites deployment uses `.openai/hosting.json` at the repository root and serves
the root `dist/`. Build with `npm --prefix web ci` and
`npm --prefix web run build:deploy`.
The frontend can also be hosted by any static host using `web` as the project
directory, `npm run build` as the build command, and `dist` as the output.

Static hosting does not run the Python models. Without a hosted API, visitors
can choose **Explore a sample assessment** after the connection attempt fails.
Sample scores are canned and do not change based on edited inputs.

To enable real predictions, set `VITE_API_BASE_URL` to the HTTPS origin of your
deployed FastAPI service before building (see `.env.example`). The service must
allow the frontend origin with CORS, or use a same-origin `/api` reverse proxy
and leave this setting empty. Requests time out after 30 seconds. Never set a
public deployment to a localhost API address or put secrets in Vite variables.

GitHub Actions runs frontend lint, tests, and the production build on pushes and
pull requests. Run the Python checks in the root README before pushing too.

## Source map

| Location | Responsibility |
| --- | --- |
| `src/App.tsx` | Workspace layout, first assessment, and viewer controls |
| `src/api/` | Request/response types, feature definitions, probability formatting, and explicit sample data |
| `src/components/` | Input form, scores, SHAP breakdown, and research notices |
| `src/store/patientStore.ts` | Shared inputs, assessed measurements, predictions, and vessel selection |
| `src/three/` | Procedural anatomical geometry, tapered vessels, tissue materials, heartbeat, and camera behavior |
| `src/vessels.ts` | Vessel identifiers, routes, probability colors, and anatomical context |
| `src/index.css` | Neutral charcoal theme, layout, accessibility, and print styling |

All anatomical geometry and textures are generated locally. The viewer caps
pixel density, avoids fullscreen postprocessing, respects reduced-motion
preferences, and pauses continuous rendering when it is outside the viewport.

Changing form fields does not overwrite the measurements associated with the
last score. Results are marked **Inputs changed** until another assessment runs.
Risk selection is shared between vessel cards and the 3D scene. Probabilities
use one decimal place so a value such as 99.68% reads as 99.7%, not 100%.
The overall CAD card uses likelihood labels, distinct from vessel stenosis
labels. A camera-following anatomical compass replaces fixed screen directions.

The heart is illustrative anatomy, not diagnostic imaging or a map of individual
lesions. See the [root README](../README.md) for the dataset, evaluation, model
limitations, and full research disclaimer.
