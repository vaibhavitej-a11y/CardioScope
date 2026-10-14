# Full-stack deployment with real predictions

Use this deployment for the working Track A prototype. One Python service serves
the built React frontend, four committed models, and SHAP explanations on the
same origin. The frontend requests `/api/predict` directly; no Vite proxy,
separate frontend host, CORS configuration, API key, or model training is needed.
`USE_MOCK` remains false. Sample assessments are an explicitly selected fallback.

## Render

1. Commit and push this source to the GitHub repository.
2. Connect Render to that repository and create a Blueprint from `render.yaml`.
   It builds the root Dockerfile and checks `/api/health` before routing traffic.
3. Wait for the deployment to become healthy, then open the service's actual URL.
4. Run `python deploy/verify.py https://YOUR-SERVICE.onrender.com` from this checkout.
   The check verifies the frontend and assets, all four models, full SHAP output,
   and different predictions for two synthetic profiles.

The Blueprint explicitly selects Render's free plan; it does not authorize a
paid upgrade. Free services can spin down and need time to wake. Open
`/api/health` and wait for readiness before recording a demo, then reload the
workspace. If memory or startup limits prevent deployment, inspect the host logs
before choosing another plan. Cloud resource usage has not been verified here.

References: [Docker hosting](https://render.com/docs/docker),
[Blueprint specification](https://render.com/docs/blueprint-spec), and
[free-service limitations](https://render.com/docs/free).

## Docker on any compatible host

```powershell
docker build -t cardioscope .
docker run --rm -p 8001:8001 --name cardioscope cardioscope
```

Open `http://localhost:8001`. To use a different container port, set `PORT` and
match the published port. The process binds `0.0.0.0`, uses one worker to avoid
duplicating model memory, and runs as a non-root user. The image includes only
the compiled frontend, serving code, model bundles, and model dependencies.

The Docker build needs network access for base images and pinned packages.
GitHub Actions builds the container and runs the full-stack verification on
each push/PR, in addition to frontend and Python tests. Container verification
is still pending until Docker or hosted CI can run it successfully.

## Verify the same server locally without Docker

```powershell
npm.cmd --prefix web run build
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir api --host 127.0.0.1 --port 8001
```

In another terminal:

```powershell
.\.venv\Scripts\python.exe deploy/verify.py http://127.0.0.1:8001
```

The API automatically serves `web/dist` when present. The Docker image sets
`CARDIOSCOPE_FRONTEND_DIR` explicitly and fails startup if the build is missing.
Development can still use Vite on port 5173 and FastAPI on 8001.

Sites hosting in `.openai/hosting.json` is an optional static frontend deployment
only. It cannot run the Python models; use this full-stack service as the main
prototype URL. No cloud deployment is claimed until its health and inference
checks pass.
