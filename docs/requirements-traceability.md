# Requirements Traceability — Track A

**Source:** `Downloads\Track A.pdf` (Multimodal AI Hackathon 2026) +
`Downloads\Problem Statements.pdf` + `docs/reference/submission-guidelines.pdf`
**Compiled:** 5 Oct 2026 · **Deadline:** 15 Oct 2026

Every numbered requirement is mapped to the component that satisfies it, the
owner, the evaluation weight it sits under, and its status.
Nothing may be marked done until the linked gate is green.

---

## Challenge statement

> Build an interactive 3D visualization system that predicts coronary artery
> disease and overall cardiac risk from patient physiological and clinical
> data, mapping predictions onto an interactive 3D human anatomical model.

---

## 1. Predictive Modeling — *(Predictive Performance, 30%)*

| Req | Requirement | Component | Owner | Status |
|---|---|---|---|---|
| 1a | Train classification models to predict overall **CAD** status | `ml/src/train.py` | M1 | ✅ done + gate green |
| 1b | Predict stenosis status for **LAD, LCX, RCA** | `ml/src/train.py` | M1 | ✅ done + gate green |
| 1c | Use demographic, clinical examination, ECG, laboratory and echocardiographic features | `ml/src/clean.py` | M1 | ✅ done + gate green |
| 1d | **Exclude `LAD`, `LCX`, `RCA`, `Cath` from model input features** to prevent target leakage | `ml/tests/test_leakage.py` | M1 | ✅ done + gate green |
| 1e | Evaluate with accuracy, precision, recall, F1-score, ROC-AUC | `ml/src/evaluate.py` | M1 | ✅ done + gate green |

> **1d is the one judges are told to ask about.** UCI's own dataset note says
> the same thing: *"only one of the LAD, LCX, RCA or Cath must be in dataset
> and the other ones must be eliminated for classification."*
> Enforcement = a unit test that fails if any banned column reaches `X`,
> plus a second test rejecting banned fields at the API boundary.

## 2. 3D Visual Mapping — *(3D Visualization, 25%)*

| Req | Requirement | Component | Owner | Status |
|---|---|---|---|---|
| 2a | Render an interactive 3D human **torso/heart** model (Three.js, WebGL, React Three Fiber **or** VTK.js) | `web/src/three/Scene.tsx` | M3 | ✅ done + gate green |
| 2b | Dynamically colour-code individual **coronary artery nodes** (LAD, LCX, RCA) by predicted stenosis probability | `web/src/three/VesselTube.tsx` + `VesselNode.tsx` | M3 | ✅ done + gate green |
| 2c | Allow users to **rotate, zoom and select anatomical regions** to inspect localized/vessel-specific risk detail | `web/src/three/Scene.tsx` + `components/VesselDetailPanel.tsx` | M3 + M4 | ✅ done + gate green |

> Spec allows **permissive choice of tech** (2a) and explicitly permits
> open-source meshes in Requirement 4 — meshes are optional, not required.

## 3. Clinical Dashboard — *(Clinical Interpretability, 20%)*

| Req | Requirement | Component | Owner | Status |
|---|---|---|---|---|
| 3a | Display predicted overall **CAD status** and vessel-specific probabilities **alongside** the 3D canvas | `components/CdbBadge.tsx`, `components/GaugeCard.tsx` | M4 | ✅ done + gate green |
| 3b | Interpretable breakdown of **why** the model predicted a risk score (SHAP **or** LIME) | `components/ShapWaterfall.tsx` | M4 | ✅ done + gate green |
| 3c | Display physiological measurements **alongside their relative contribution** to the overall prediction | `components/FeatureContribution.tsx` | M4 | ✅ done + gate green |

## 4. 3D models

| Req | Requirement | Component | Owner | Status |
|---|---|---|---|---|
| 4 | *May* use open-source mesh anatomical files (`.obj`/`.gltf`) | `web/src/three/Heart.tsx` | M3 | ⬜ gated Day 4 |

> Optional. Decision gate on Day 4 — see `decision-record.md` D1.

## 5. Clinical Safety Disclaimer — *(mandatory, no score weight of its own)*

| Req | Requirement | Component | Owner | Status |
|---|---|---|---|---|
| 5 | UI must show **clear, visible** disclaimers that predictions are for decision support / educational purposes only and are **not a substitute for formal diagnostic imaging** | `components/DisclaimerBanner.tsx`, `DisclaimerModal.tsx`, page footer · text source `api/app/constants.py` | M4 render · M2 source | ✅ done + gate green |

> Placed in **banner + footer + startup modal** so it cannot be missed.

---

## Expected Deliverables

| # | Deliverable | Requirement | Component / owner | Status |
|---|---|---|---|---|
| D-1 | **Working software prototype** — web app with interactive 3D viewer integrated with the ML backend | whole system | M1–M4 | 🟡 in progress |
| D-2 | **Trained prediction pipeline** — clean code + model weights for cardiac risk and multi-vessel stenosis classification | §1 | `ml/` · M1 | ✅ done + gate green |
| D-3 | **Clinical explanation dashboard** — prediction metrics, SHAP/LIME importances, physiological breakdowns | §3 | `web/src/components/` · M4 | 🟡 in progress |
| D-4 | **Project documentation, max 6 pages** — preprocessing, model architecture, 3D pipeline setup, usage instructions, evaluation results | deliverable | `docs/submission/index.md` · M4 | ⬜ |
| D-5 | **Demonstration video, 3–10 minutes on YouTube** — working system, feature input workflow, 3D interactions, technical implementation | deliverable + Devpost rule | `docs/demo/` · M4 | ⬜ |

---

## Technical Considerations

| Consideration | Component | Owner | Status |
|---|---|---|---|
| Responsive 3D in modern browsers **without a dedicated GPU** | `three/Scene.tsx` — low poly count, no post-processing | M3 | 🟡 in progress |
| Architecture must allow adding clinical features, prediction models or anatomical structures **without a complete redesign** | `api/` route + model registry · `ml/` one pipeline per target · `web/` data-driven form | M2, M1, M4 | 🟡 in progress |
| **Consistent correspondence** between model outputs and the displayed LAD/LCX/RCA structures | shared vessel constants (`LAD`/`LCX`/`RCA`) used by API, store and 3D layer | M3 + M4 | 🟡 in progress |

---

## Devpost submission rules — *found Day 0, see `submission-guidelines-findings.md`*

| # | Requirement | Owner | Status |
|---|---|---|---|
| S-1 | **Project description** on the Devpost project page (what we built, problem, how it works) | M4 | ⬜ |
| S-2 | **Public GitHub repo** with source + docs; README must have setup instructions, prerequisites/dependencies, run instructions | all · README M4 | ⬜ repo exists, README stub |
| S-3 | **Demo video 3–10 min on YouTube** — unlisted OK, **private NOT OK**; must show it running and explain the approach; **English audio or English subtitles** | M4 | ⬜ |
| S-4 | **Team info, real full names**; every member has a Devpost account **and is added to the submission** | all 4 members | ⬜ **team action** |

---

## Evaluation criteria — where the points come from

| Criteria | Weight | Primary owner | Main evidence |
|---|---|---|---|
| Predictive Performance | **30%** | M1 | CV metrics with variance, leakage test |
| 3D Visualization | **25%** | M3 | Anatomy, spatial risk mapping, interaction |
| Clinical Interpretability | **20%** | M4 | SHAP quality, clarity of risk explanation |
| System Integration | **15%** | M2 | Data pipeline, model↔dashboard integration, real-time updates |
| Technical Implementation | **10%** | all | Architecture, code quality, reproducibility, public dataset use |

---

## Status legend

⬜ not started · 🟡 in progress · ✅ done + gate green · ❌ blocked
