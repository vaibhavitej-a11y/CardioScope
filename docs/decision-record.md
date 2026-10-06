# Decision Record — Track A

Decisions taken before build starts, with rationale. Anything we defer is
recorded with a **revisit date** so it cannot be quietly forgotten.

**Created:** 5 Oct 2026 · **Deadline:** 15 Oct 2026

---

## D0 — Tech stack *(locked 5 Oct)*

| Layer | Decision | Why |
|---|---|---|
| Frontend | React 19 + Vite 8 + **TypeScript 5.x** | Contract safety across 4 people. `typescript@5` pinned — npm's `typescript@7` is the new native rewrite and riskier with current tooling |
| 3D | **React Three Fiber 9 + drei** | Explicitly named in requirement 2a; drei supplies OrbitControls, GLTF loader, HUD |
| Styling | Tailwind CSS 4 | Fastest route to a dense clinical dashboard without a design system |
| State | Zustand | One store shared by form ↔ 3D ↔ dashboard |
| Charts | Recharts | SHAP waterfall / bar |
| Backend | FastAPI + Uvicorn | Same language as the ML — no ONNX or sidecar. Auto-generates `/api/schema` |
| ML | sklearn pipelines + LightGBM / XGBoost / CatBoost, 5-fold stratified CV | Installed, strongest on 303-row tabular data |
| Explainability | SHAP `TreeExplainer` | §3b allows SHAP *or* LIME; SHAP is the standard and cheap for tree models |
| Persistence | joblib, no DB | 4 small models |
| Docs | Markdown → HTML → **Chrome headless PDF** | `pandoc` unavailable; Chrome gives full control of the 6-page layout |
| Video | **OBS Studio** | Nothing was installed; must be present by Day 8 |
| Runtime | **Local only** | `uvicorn` + `vite`. No deploy risk |
| VCS | git + GitHub, **public repo** | Devpost rule S-2 requires a public repository |

---

## D1 — Anatomy approach: procedural vs `.glb` mesh vs hybrid

**Status:** ⏳ **GATE — Day 4 (9 Oct), ≤3 h hard cutoff**

Requirement 2a asks for a 3D "human torso/heart model"; 3D Visualization is
25% of the score and is graded on *anatomical representation*. Requirement 4
explicitly **permits** open-source `.obj`/`.gltf` meshes but does not require
them.

**Decision rule:**

```
Start of Day 4 → attempt a permissively-licensed .glb heart, overlay
                 procedural LAD/LCX/RCA tubes
                 ├─ tubes align to grooves within 3 h  → SHIP THE MESH
                 └─ not aligning                      → STOP. Procedural.
                                                       Log the reason here.
```

**Fallback is fully scoped** — procedural heart is the default and is known to
work. No plan dependency on the mesh succeeding.

**Gate outcome:** _to be recorded Day 4_

---

## D2 — Torso shell or heart only?

**Status:** ✅ **DECIDED — torso is COULD tier (stretch)**

Requirement 2a reads "human torso/**heart** model" — the slash makes either
acceptable. The heart is what carries the graded content (vessels, colours,
selection).

* **MUST:** heart with LAD/LCX/RCA, rotate, zoom, colour by probability
* **COULD:** low-poly torso shell for context — build it **only after** every
  MUST item is done

---

## D3 — "Coronary artery nodes" (§2b) vs tubes

**Status:** ✅ **DECIDED — do both**

Requirement 2b literally says *"color-code of individual coronary artery
**nodes**"*, but continuous coloured vessels are what read anatomically and
what the demo looks like with.

* **Tubes** — continuous LAD/LCX/RCA colour ramps (the visual signature)
* **Node markers** — an explicit clickable node on each vessel, so the literal
  wording of §2b is satisfied and §2c selection has an obvious target

---

## D4 — §2c "select anatomical regions" scope

**Status:** ✅ **DECIDED — vessel-level MVP; sub-region selection is stretch**

MUST: click a vessel (tube or node) → vessel-specific risk detail panel.

STRETCH: selection finer than a vessel. The dataset does **not** contain
pixel-level lesion locations — `Region RWMA` is a *region label*, not a
coordinate — so finer mapping would be inventing detail we do not have and
must not claim (see wording rules).

---

## D5 — SHAP or LIME?

**Status:** ✅ **DECIDED — SHAP only. LIME cut.**

§3b offers either. SHAP `TreeExplainer` on tree models is fast and gives
consistent attributions across all 4 predictions. Adding LIME doubles the
interpretability surface for no extra score.

---

## D6 — Model selection strategy

**Status:** ✅ **DECIDED — 4 independent binary classifiers, one shared
preprocessing pipeline, 5-fold stratified CV, pick on ROC-AUC**

n = 303, so: stratified splits, `class_weight="balanced"` rather than
oversampling, and **variance reported** for every metric. Honest numbers beat
optimistic ones — §1e and the FAQ both expect this.

**Cut rule:** if M1 is behind by end of Day 3 → 2 model families + logistic
baseline, no tuning.

---

## D7 — Language / typing boundary

**Status:** ✅ **DECIDED — TypeScript across the whole frontend**

Types on the `/api/predict` contract, the Zustand store and R3F components.
Costs setup time; converts integration breakage from runtime-during-the-demo
into compile time.

---

## D8 — Deployment

**Status:** ✅ **DECIDED — local only**

`uvicorn` + `vite`. Docker and hosted URLs are COULD tier and are **cut**
unless everything else is finished. Devpost only requires a public repo, a
description and a video — not a live URL.

---

## Known constraints (not decisions, but they shape everything)

| Constraint | Source | Consequence |
|---|---|---|
| `LAD`, `LCX`, `RCA`, `Cath` excluded from inputs | Track A §1d + UCI Note 1 | Enforced by unit test |
| n = 303, 59 features, 0 missing | UCI 411 | Stratified CV, report variance, no fancy imbalance tricks |
| `Region RWMA` is a region **label**, not a location | Track A primer | Never present as pixel/3D lesion mapping |
| Max 6 pages of documentation | Track A deliverables | Draft starts Day 6 |
| Video 3–10 min, YouTube, **unlisted or public, never private**, English audio **or** subtitles | Devpost rules | Record Day 8, decide narration vs captions before recording |
| Public GitHub repo, README with setup + prerequisites + run instructions | Devpost rules | README stub exists, filled Day 9 |
| Teams are 1–4, real full names, **every member added on Devpost** | Devpost rules | All 4 members must register and be added — **time-sensitive** |
| No dedicated GPU | Track A technical consideration | Low poly count, no post-processing |
| Disclaimer visible in UI | Track A §5 | Banner + footer + startup modal |

---

## Open items blocking nothing yet

1. **Exact Devpost deadline timestamp** (time + timezone) — 15 Oct date alone
   is not enough to plan the final upload
2. **Is the team created/registered on Devpost?** — if not, that is the
   single highest-risk untracked task
3. **Video: narrated or silent + subtitles?** — decide before Day 8
4. **Devpost project description** — fifth write-up (S-1), draft Day 7
