# CardioScope — Track A, Multimodal AI Hackathon 2026

Interactive 3D cardiovascular risk visualization and prediction.
Predicts overall CAD status and LAD/LCX/RCA stenosis probability,
then maps them onto an interactive 3D human anatomical model.

> **For decision support / educational purposes only — not a substitute
> for formal diagnostic imaging.**

**Repo:** https://github.com/vaibhavitej-a11y/CardioScope
**Deadline:** 15 Oct 2026 · **Team:** 4 (M1–M4) · **Track A**

---

## 1. Prerequisites

Install these once before doing anything else.

| Tool | Version tested | Why | Check |
|---|---|---|---|
| **Python** | `3.13.14` | ML pipeline + FastAPI | `python --version` |
| **Node.js** | `24.18.0` | React frontend (Vite 8 needs ≥ 20.19 / 22.12) | `node --version` |
| **npm** | `11.16.0` | JS package installer | `npm --version` |
| **Git** | `2.55.0` | cloning / pushing | `git --version` |
| **VS Code** | any recent | editing | — |

- **Windows users:** Python must be on your `PATH`. During install tick
  *"Add python.exe to PATH"*. If `python` opens the Microsoft Store instead,
  run `py --version` instead of `python --version`.
- **Only M4 needs extra tools** (recorded near the deadline): OBS Studio for
  the demo video.

---

## 2. Setup

```powershell
# 1. clone
git clone https://github.com/vaibhavitej-a11y/CardioScope.git
cd CardioScope

# 2. ONE Python virtualenv for the whole repo  (ml/ + api/ share it)
python -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt   # pulls in ml/ and api/ automatically

# 3. frontend packages
cd web
npm install
cd ..
```

`requirements.txt` at the repo root is the only file you need — it includes
`ml/requirements.txt` and `api/requirements.txt` via `-r` includes, plus
`pytest` and `httpx` for tests.

**Sanity check:**

```powershell
python -c "import shap, sklearn, fastapi, pandas; print('python deps OK')"
npm --prefix web run build        # should end with "✓ built in"
```

---

## 3. Run

Everything runs locally — no Docker, no hosted services, no accounts.
Open **three terminals**, all from the repo root.

| # | Terminal | Command | Folder | Status |
|---|---|---|---|---|
| 1 | **Frontend** | `npm run dev` | `web/` | ✅ **works today** |
| 2 | **Backend** | `uvicorn app.main:app --reload --port 8001` | `api/` | ✅ **works today** |
| 3 | **ML training** | `python ml/src/train.py` | repo root | ✅ **works today** |

Training takes ~95 s and rewrites `ml/artifacts/`. Verified metrics
(5-fold stratified CV, seed 42, out-of-fold pooled):

| Target | Model | ROC-AUC | F1 | Precision | Recall | Accuracy |
|---|---|---|---|---|---|---|
| Cath (CAD) | CatBoost | **0.912** | 0.900 | 0.887 | 0.912 | 0.855 |
| LAD | CatBoost | **0.849** | 0.819 | 0.797 | 0.842 | 0.782 |
| LCX | CatBoost | **0.739** | 0.617 | 0.640 | 0.597 | 0.710 |
| RCA | CatBoost | **0.703** | 0.507 | 0.558 | 0.465 | 0.660 |

Each model is also evaluated at an inner-CV-selected operating point
(higher recall for screening); both operating points are recorded in
`ml/artifacts/metrics.json`. LCX and RCA are the genuinely hard targets
— that is what the data supports, not a bug.

Model selection is restricted to candidates that can explain themselves in
probability units (requirement 3b). On this build XGBoost cannot: it raises
`NotImplementedError` for `feature_perturbation="interventional"` +
`model_output="probability"`, so its raw/log-odds contributions run ~18×
larger than the others'. Letting it win LCX would have made the 3D vessel
contributions incomparable across targets — LCX ROC-AUC 0.743 → 0.739 buys
F1 0.583 → 0.617 and one consistent unit everywhere. The capability is
probed at runtime and recorded in `metrics.json` → `shap_capability`, and
`ml/tests/test_artifacts.py` asserts every shipped model uses
`interventional_probability`.

```powershell
# Terminal 1 — frontend (available now)
cd web
npm run dev            # → http://localhost:5173

# Terminal 2 — prediction API (works now)
cd api
..\.venv\Scripts\activate        # venv lives at the REPO ROOT, not in api/
uvicorn app.main:app --reload --port 8001    # → http://127.0.0.1:8001/docs

# Terminal 3 — train the models (works now), from the repo root
python ml/src/train.py
```

The frontend dev server proxies `/api` to `http://127.0.0.1:8001`
(configured in `web/vite.config.ts`), so no CORS setup is needed. Port 8000
is reserved for other local projects on the dev machine.

### Other commands

```powershell
npm --prefix web run lint      # oxlint
npm --prefix web run build     # tsc -b + vite build   (verified passing)
npm --prefix web run preview   # serve the production build
python -m pytest ml/tests      # leakage guard + artifact contract (passing)
python -m pytest api/tests     # API contract + boundary + parity gates
pytest                         # all tests (38 passing)
```

---

## 4. Dataset

The raw data **ships with this repo** at
`ml/data/raw/extention of Z-Alizadeh sani dataset.xlsx` — nothing to download.

| | |
|---|---|
| Source | UCI Machine Learning Repository, id **411** |
| Title | *Extension of Z-Alizadeh Sani dataset* |
| DOI | [10.24432/C5461K](https://doi.org/10.24432/C5461K) |
| Size | **303 patients × 59 features** (verified: 0 missing values) |
| Targets | `LAD`, `LCX`, `RCA`, `Cath` |

**Licence:** CC BY 4.0 — Z-Alizadeh Sani et al., via the UCI Machine
Learning Repository, <https://creativecommons.org/licenses/by/4.0/>.
The raw file is stored **unmodified**. Credit is retained in this README as
required by the licence.

### Target leakage — read this before touching the model

`LAD`, `LCX`, `RCA` and `Cath` are **excluded from the model inputs**.
They are the *answers* (what the catheter found), so letting them in as
features would make results fake. This is enforced by an automated test,
`ml/tests/test_leakage.py` — if you add a feature and the test fails, the
feature is wrong, not the test.

---

## 5. Repository structure

| Folder | Owner | Purpose |
|---|---|---|
| `ml/` | M1 | Training pipeline, model artifacts, leakage tests |
| `api/` | M2 | FastAPI prediction service (`POST /api/predict`) |
| `web/` | M3 (`src/three`) · M4 (`src/components`) | React + React Three Fiber frontend |
| `docs/` | M4 | Requirements, decision record, submission documentation |

---

## 6. Team workflow

Anyone, any time:

```powershell
git pull origin main            # always start from the latest main
# ... make your changes ...
git add -A
git commit -m "m2: describe what changed"
git push origin main
```

Never commit: anything in `ml/data/processed/`, `.venv/`, `node_modules/`,
`dist/`, `*.mp4`, `*.log`. `.gitignore` already blocks these.

---

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| `'venv' is not recognized` | `python -m venv .venv` — never `venv .venv` |
| Activation blocked in PowerShell | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| `python` opens the Microsoft Store | use `py` instead, or reinstall with *Add to PATH* |
| `pip` installs to the wrong Python | run `.venv\Scripts\activate` **first**, check `python -m pip --version` |
| Port 8001 already in use | `netstat -ano \| findstr :8001` then `taskkill /PID <id> /F` |
| Port 5173 in use | Vite auto-picks 5174 — read the URL it prints |
| `npm install` hangs or fails | `npm cache clean --force`, delete `web/node_modules`, retry |
| Tailwind classes do nothing | you edited the wrong file — `web/src/index.css` must start with `@import "tailwindcss";` |
| `tsc` errors after a teammate's push | `cd web`, then `npm install` — lockfile probably changed |

---

## 8. Submission checklist (Devpost)

- [ ] Project description on the Devpost page
- [ ] **This repo is PUBLIC** with README containing prerequisites, setup and run steps
- [ ] Demo video, 3–10 min, YouTube, **never private** — English audio **or** English subtitles
- [ ] All 4 team members registered on Devpost **and added to the submission**
- [ ] 6-page documentation PDF
- [ ] Disclaimer visible in the app (banner + footer + startup modal)
