# D-5 — Demo Video Script (3–10 min)

**Target length:** ~6:30 · **Language:** English narration **or** burned-in
English subtitles (Devpost: unlisted YouTube OK, **never private**).
**Tool:** OBS Studio (decision D0) · record 1920×1080 @ 30 fps.

## Pre-flight checklist

- [ ] `npm run dev` on **5174/5173** with final visuals (dark studio
      backdrop, bloom, blood-flow bands, cardiac veins)
- [ ] `python ml/src/train.py` already run → `ml/artifacts/` current
- [ ] API running — `cd api && uvicorn app.main:app --port 8001` → live
      model numbers, no demo banner (flip `USE_MOCK` back for offline demos)
- [ ] Browser window only (no desktop icons / personal tabs); modal dismissed
      at start so it can be *shown* deliberately
- [ ] Sample patient preloaded (Age 59, Male — the worked example)
- [ ] Mic test — or decide subtitles-first and write them while editing
- [ ] Recording ends before any `.gitignore`-blocked file appears on screen

## Shot list

| # | Time | Screen | Narration (or subtitle text) |
|---|---|---|---|
| 1 | 0:00–0:25 | Title card → app boots, **startup disclaimer modal** visible | "CardioScope — an interactive 3D cardiovascular risk visualiser. Predictions here are for decision support and education only, not a substitute for formal diagnostic imaging." |
| 2 | 0:25–0:55 | Slow orbit around the 3D heart (heartbeat ON) | "Coronary risk is usually tables of numbers. CardioScope predicts overall CAD status and stenosis probability for the three main coronary arteries — and puts the answer where it belongs: on the anatomy." |
| 3 | 0:55–1:40 | Patient form: scroll groups, change Age/Sex, click **Run prediction** | "The form mirrors the 54 features the models were trained on — demographics, risk factors, examination, ECG, labs, echocardiography. Change a value, run a prediction — the dashboard and the 3D colouring update together." |
| 4 | 1:40–2:40 | 3D interactions: **drag rotate, scroll zoom, click LAD tube, node markers, camera presets** Anterior/Posterior/Basal/Apical, labels LAD 96% / LCX 66% / RCA 83%, blood-flow bands pulsing | "Rotate, zoom, select. Each vessel is colour-ramped by its predicted stenosis probability — watch the blood flow pulse along the arteries and the cardiac veins beside them. Clicking a tube or node switches the explanation panel to that vessel. Camera presets give the standard views. Note the honest labels: 96% for LAD marked stenotic, 66% for LCX left uncertain, 83% for RCA." |
| 5 | 2:40–3:30 | Dashboard right panel: CAD donut, three vessel cards, **SHAP driver panel** | "Beside the model: overall CAD status with predicted probability, per-vessel cards, and SHAP — each row shows exactly which features raised or lowered this prediction, next to the measured values." |
| 6 | 3:30–4:30 | Code tour: `ml/src/data.py` (leakage guard), `ml/tests/test_leakage.py` running green, `ml/artifacts/metrics.json` | "Under the hood: four gradient-boosted classifiers, 5-fold stratified cross-validation, seed 42. The cath results are answers, not inputs — leakage is blocked by a unit test, not by convention. CAD ROC-AUC 0.912, LAD 0.849." |
| 7 | 4:30–5:10 | `web/src/three/` — Heart.tsx lathe + materials.ts fresnel; cut back to app close-up of muscle surface | "The anatomy is fully procedural — no downloaded meshes, so it works offline and on machines without a GPU. Physical materials, rim light, travelling blood-flow bands and a systolic contraction keep it readable and alive." |
| 8 | 5:10–5:50 | Honest numbers: LCX/RCA cards + limitations line in docs | "We report the hard results too: LCX 0.74 and RCA 0.70 ROC-AUC are the dataset's honest ceiling today. Vessel-level mapping is the resolution the data supports — the dataset has no lesion coordinates, and we don't invent them." |
| 9 | 5:50–6:20 | Terminal: `git clone` + `pip install` + `npm run dev` in fast-forward | "Everything runs locally: clone, one virtualenv, npm install, train in 70 seconds, start the frontend. Full instructions are in the README." |
| 10 | 6:20–6:30 | Repo URL + team card + disclaimer text | "CardioScope — source and documentation on GitHub. Decision support only." |

## Edit notes

- Cut terminal typing with fast-forward; never show waiting (70 s train → 5×).
- If narration: record voiceover first, then cut video to audio.
- If subtitles: burn them in (OBS can't) — use CapCut/DaVinci; keep one
  sentence on screen at a time.
- Upload as **Unlisted**, paste URL into `docs/submission/devpost-description.md`
  placeholder and the Devpost submission.
- Final check: video shows the project **running** ✓ and **explains the
  approach** ✓, length 3–10 min ✓, English ✓, not private ✓.
