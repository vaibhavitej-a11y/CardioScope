"""Production frontend routing must preserve API routes and file boundaries."""
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.hosting import mount_frontend


def test_frontend_assets_and_api_share_an_origin(tmp_path: Path):
    (tmp_path / "index.html").write_text("<h1>CardioScope</h1>", encoding="utf-8")
    (tmp_path / "assets").mkdir()
    (tmp_path / "assets" / "app.js").write_text("console.log('workspace')", encoding="utf-8")
    app = FastAPI()

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    mount_frontend(app, tmp_path, required=True)
    with TestClient(app) as client:
        page = client.get("/")
        assert page.status_code == 200
        assert "text/html" in page.headers["content-type"]
        assert "CardioScope" in page.text
        assert client.get("/assets/app.js").status_code == 200
        assert client.get("/api/health").json() == {"status": "ok"}
        assert client.get("/api/missing").status_code == 404
        assert client.get("/assets/missing.js").status_code == 404
        assert client.get("/%2e%2e/constraints.txt").status_code == 404


def test_explicit_missing_build_fails_instead_of_deploying_api_only(tmp_path: Path):
    with pytest.raises(RuntimeError, match="Frontend build missing"):
        mount_frontend(FastAPI(), tmp_path, required=True)


def test_api_only_development_can_start_without_a_build(tmp_path: Path):
    app = FastAPI()
    mount_frontend(app, tmp_path)
    with TestClient(app) as client:
        assert client.get("/").status_code == 404
