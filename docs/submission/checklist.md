# Final submission checklist

## Repository package

- [x] Frontend connects to the real local prediction API.
- [x] CAD and vessel probabilities share their explanations and 3D selection.
- [x] Overall CAD uses likelihood wording; vessel cards retain stenosis wording.
- [x] Anatomical directions follow the camera.
- [x] Decimal probabilities avoid displaying rounded certainty.
- [x] Python dependencies are pinned to the verified model/runtime environment.
- [x] npm lockfile, trained models, attributed dataset, and run instructions included.
- [x] Unused starter assets removed; local dependencies, logs, and caches ignored.
- [x] Root and frontend READMEs explain setup, API startup, preview, and limitations.
- [x] Technical report source and a PDF of at most six pages included.
- [x] Devpost description matches the recorded model metrics and implementation.
- [x] Full-stack Docker/Render configuration serves frontend and real API together.
- [x] Local full-stack HTTP check verifies changed predictions and SHAP for changed inputs.
- [ ] Verify the container build and cloud deployment; record the actual working URL.
- [ ] Check rotation, zoom, vessel selection and form updates in a modern browser without a dedicated GPU.

## Checks before the final commit

```powershell
npm.cmd --prefix web test
npm.cmd --prefix web run lint
npm.cmd --prefix web run build
.\.venv\Scripts\python.exe -m pytest api/tests ml/tests -q
git diff --check
git status --short
```

Verify /api/health and one prediction through the frontend. Confirm CAD likelihood
labels, changing inputs, vessel selection, and camera orientation in the browser.
Review every intended change, then commit and push to the intended branch.

## Required actions outside this workspace

- [ ] Commit and push the reviewed changes to the public GitHub repository.
- [ ] Verify the repository is publicly accessible without signing in.
- [ ] Record and upload the required 3–10 minute YouTube demonstration.
- [ ] Use English narration or English subtitles; video must not be private.
- [ ] Enter the actual video URL and repository URL on Devpost.
- [ ] Paste the project description and attach the final index.pdf.
- [ ] Add all four team members using their registered real names.
- [ ] Verify every team member is registered and attached to the submission.
- [ ] Complete the final Devpost submission before the published deadline.

No video URL, teammate names, public visibility, or Devpost completion is assumed
or fabricated by the repository preparation process.
