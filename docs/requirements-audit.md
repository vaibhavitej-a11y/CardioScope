# Track A requirement audit — 14 October 2026

Reviewed against the original four-page `Downloads/Track A.pdf`, the two-page
`Downloads/Problem Statements.pdf`, and `docs/reference/submission-guidelines.pdf`.
This audit distinguishes implemented behavior from deployment and submission.

| Requirement | Evidence | Status |
| --- | --- | --- |
| 1a: Overall CAD classification | `ml/src/train.py`, `Cath.joblib`, `/api/predict`; dashboard shows `shap.cad.label` from the trained operating threshold | Implemented; real inference verified locally |
| 1b: LAD, LCX, RCA stenosis | Three independent trained bundles; vessel probabilities and classifications in API | Implemented; real inference verified locally |
| 1c: Required clinical feature groups | 54-feature schema, Pydantic validation, data-driven frontend form | Implemented; schema parity tests |
| 1d: Exclude all four target columns | `ml/tests/test_leakage.py`; API rejects unknown/target fields | Verified by automated tests |
| 1e: Accuracy, precision, recall, F1, ROC-AUC | `ml/artifacts/metrics.json`, root README and technical report | Present for all targets |
| 2a: Interactive torso/heart | Procedural heart in React Three Fiber; requirement permits a heart and does not mandate an external mesh | Implemented; browser review still required |
| 2b: Dynamic coronary node colors | Shared probabilities drive LAD/LCX/RCA tubes and selectable nodes in `Scene.tsx` | Implemented; browser review still required |
| 2c: Rotate, zoom, anatomical selection | Orbit controls, camera presets, vessel/node/label selection, linked explanation panel | Implemented; browser review still required |
| 3a: CAD status and vessel probabilities beside 3D | `RiskStrip.tsx`, `CdbBadge.tsx`, `GaugeCard.tsx`; explicit CAD model classification added in this pass | Implemented; frontend build passes |
| 3b: SHAP/LIME explanations | Probability-unit SHAP for all four outputs, sorted clinical contributions | Implemented; artifact and API tests |
| 3c: Measurements alongside contributions | `ExplainPanel.tsx` displays assessed feature values and signed contributions | Implemented; browser review still required |
| 4: Optional anatomical meshes | Procedural anatomy; externally downloaded mesh is optional | Satisfied by permitted implementation choice |
| 5: Clear educational/imaging disclaimer | Startup modal, banner, footer, shared API disclaimer text | Implemented; parity tests |

## Deliverables and remaining work

| Deliverable / consideration | Status |
| --- | --- |
| Working frontend integrated with ML backend | Verified locally on one HTTP origin, including compiled JS/CSS and input-dependent predictions/SHAP; cloud deployment pending |
| Trained code and weights | Present; no retraining required |
| Clinical explanation dashboard | Implemented |
| Technical documentation, at most six pages | Report PDF inspected: six pages; contains preprocessing, architecture, visualization, usage and metrics |
| 3–10 minute YouTube demonstration | Not verified; a script is present but is not the required video |
| Responsive operation without dedicated GPU | Rendering limits/reduced motion implemented; integrated-GPU browser performance not measured |
| Extensible features/models/anatomy | Data-driven features, model registry, shared vessel mapping implemented |
| Consistent LAD/LCX/RCA correspondence | Shared identifiers across API, state, cards and scene implemented |
| Public GitHub source and setup README | Source and README ready; public visibility and push not confirmed |
| Devpost project description | Draft prepared; actual submission not confirmed |
| English narration or English subtitles | Required for demo; not confirmed |
| Real full names and every teammate added on Devpost | Not confirmed |
| Exact submission deadline | Must be checked on the event page; do not infer it from the planning date alone |

## Deployment decision

A standalone static frontend is insufficient for live inference. `Dockerfile`
and `render.yaml` now describe a single Python web service that serves both the
compiled frontend and `/api/predict`. `deploy/verify.py` checks the actual service
URL with two synthetic profiles and confirms changed outputs and explanations.
The Sites static configuration is retained only as an optional frontend host.

No hosted URL is claimed as live. Render was discovered but is not connected;
local GitHub/hosting Git network access is unavailable, and Docker's daemon is
not running. The locally running production server was verified successfully.

Final local checks: 44 Python tests and five frontend tests passed, frontend lint
and production build passed, and `git diff --check` passed. Full-stack HTTP
verification at `http://127.0.0.1:8011` served the compiled frontend and assets,
loaded all four CatBoost models, and returned CAD probabilities of approximately
0.01445 and 0.99801 for two distinct synthetic profiles. Vessel probabilities
and SHAP contributions also changed. These synthetic results verify inference
behavior; they are not patient outcomes or model performance metrics.

## Interpretation limits affecting judging

The 303-record dataset has no independent external test set. Reported results
are research cross-validation, not clinical validation. LCX and RCA ROC-AUC
(0.739 and 0.703) are weaker than CAD and LAD (0.912 and 0.849). Model selection
also uses this cohort, so its selected-model metrics can be optimistic.
Probabilities are not established as clinically calibrated. The anatomy is
illustrative and vessel-level; the dataset cannot support lesion localization.
These are quality limitations, not missing mandatory model outputs.
