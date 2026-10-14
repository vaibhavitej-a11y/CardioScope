"""Serve the compiled frontend beside the real prediction API."""
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles


def mount_frontend(app: FastAPI, directory: Path, *, required: bool = False) -> None:
    if not (directory / "index.html").is_file():
        if required:
            raise RuntimeError(f"Frontend build missing in {directory}; run npm --prefix web run build")
        return
    # Register last: /api, /docs and /openapi.json retain their own routes.
    # StaticFiles restricts access to this directory and returns 404 for missing files.
    app.mount("/", StaticFiles(directory=directory, html=True), name="frontend")
