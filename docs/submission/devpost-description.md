# Devpost Project Description (S-1) — draft for copy-paste

> Paste into the Devpost "Project Description" field (Markdown renders there).
> Fill `[]` placeholders before submitting.

---

## The problem

Coronary artery disease is the world's leading cause of death, yet risk is
usually presented as tables and scores that are hard to interpret spatially.
Clinicians and students must translate "LAD 94% predicted stenosis
probability" into an anatomical picture in their head — and that translation
is exactly where mistakes happen.

## What we built

**CardioScope** — an interactive 3D cardiovascular risk visualisation:

- **Predicts** overall CAD status and *predicted stenosis probability* for
  three major coronary arteries (LAD, LCX, RCA) from **54 routine clinical
  features** (demographics, examination, ECG, laboratory, echocardiography).
- **Maps the predictions onto an interactive 3D heart**: each vessel is
  colour-ramped by its predicted risk, clickable, and labelled with its
  probability. Rotate, zoom, select a vessel → instant detail panel.
- **Explains every prediction** with SHAP: one panel where each driver
  appears once — feature, measured value and signed contribution side by
  side; select a vessel and the same panel reframes to it.
- **Safety-first**: a clear disclaimer in the startup modal, a persistent
  banner and the page footer — *decision support / educational only*.

## How it works

| Layer | Stack |
|---|---|
| ML | 4 gradient-boosted classifiers (CatBoost/XGBoost/LightGBM) + logistic baseline, 5-fold stratified CV (seed 42), SHAP `TreeExplainer`. Target leakage (`Cath`, `LAD`, `LCX`, `RCA` as inputs) is blocked by unit tests. |
| Backend | FastAPI `POST /api/predict`, typed contract shared with the frontend |
| Frontend | React 19 + TypeScript + React Three Fiber — **fully procedural anatomy** (zero downloaded assets, works offline), Zustand store drives form ↔ 3D ↔ dashboard |

**Headline metrics** (pooled out-of-fold, n = 303, UCI 411, CC BY 4.0):

| Target | ROC-AUC | F1 |
|---|---|---|
| CAD (Cath) | **0.913** | 0.900 |
| LAD | **0.847** | 0.819 |
| LCX | 0.743 | 0.583 |
| RCA | 0.704 | 0.507 |

## What's working today

- Interactive 3D viewer: rotate / zoom / select vessels, camera presets,
  heartbeat animation, pulsing blood-flow bands, cardiac veins, risk
  colouring and labels
- 54-feature patient form with population defaults; run predictions end-to-end
- SHAP explanation panel scoped to the 3D selection, measurements alongside
  contributions
- Training pipeline (70 s, reproducible), 20/20 tests, lint + build clean
- 6-page technical documentation (attached)

## Run it

```powershell
git clone https://github.com/vaibhavitej-a11y/CardioScope.git
cd CardioScope
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
cd web && npm install && cd ..
python ml/src/train.py        # train all 4 models (~70 s)
npm --prefix web run dev      # → http://localhost:5173
```

## Demo video

[https://youtu.be/](placeholder) — 3–10 min walkthrough (English).

## Team

4 members — names as registered on Devpost.

> For decision support / educational purposes only — not a substitute for
> formal diagnostic imaging.
