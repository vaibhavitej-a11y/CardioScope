"""Verify a running full-stack deployment, including real input-dependent inference.

Usage: python deploy/verify.py http://127.0.0.1:8001
Uses synthetic profiles, not patient records. Requires only the standard library.
"""
from __future__ import annotations

import json
import re
import sys
import time
from pathlib import Path
from urllib.error import URLError
from urllib.parse import urljoin
from urllib.request import Request, urlopen


def verify(origin: str) -> None:
    origin = origin.rstrip("/") + "/"

    def fetch(path: str, payload: dict | None = None):
        request = Request(
            urljoin(origin, path),
            data=json.dumps(payload).encode() if payload is not None else None,
            headers={"Content-Type": "application/json"} if payload is not None else {},
        )
        with urlopen(request, timeout=120) as response:
            return response.read(), response.headers.get("Content-Type", "")

    deadline = time.monotonic() + 180
    while True:
        try:
            health = json.loads(fetch("api/health")[0])
            break
        except (URLError, TimeoutError):
            if time.monotonic() >= deadline:
                raise
            time.sleep(2)
    assert health["status"] == "ok", health
    assert set(health["models"]) == {"Cath", "LAD", "LCX", "RCA"}, health
    assert set(health["shap_modes"].values()) == {"interventional_probability"}, health

    page, content_type = fetch("")
    assert "text/html" in content_type and b"CardioScope" in page
    assets = re.findall(r'(?:src|href)="([^\"]+\.(?:js|css))"', page.decode())
    assert assets, "No compiled frontend assets referenced"
    for asset in assets:
        assert fetch(asset)[0], asset

    schema = json.loads((Path(__file__).resolve().parents[1] / "ml/artifacts/feature_schema.json").read_text(encoding="utf-8"))
    payload = {name: stats["mean"] for name, stats in schema["numeric_features"].items()}
    payload.update({name: values[0] for name, values in schema["categorical_features"].items()})
    profiles = [
        {**payload, "Age": 30, "Typical Chest Pain": 0, "HTN": 0, "DM": 0, "EF-TTE": 65},
        {**payload, "Age": 75, "Typical Chest Pain": 1, "HTN": 1, "DM": 1, "EF-TTE": 35},
    ]
    results = [json.loads(fetch("api/predict", profile)[0]) for profile in profiles]
    for result in results:
        assert set(result["vessels"]) == {"LAD", "LCX", "RCA"}
        assert all(0 <= probability <= 1 for probability in [result["cad"], *result["vessels"].values()])
        assert result["shap"]["cad"]["label"] in {"CAD", "Normal"}
        for scope in ["cad", "LAD", "LCX", "RCA"]:
            assert {entry["feature"] for entry in result["shap"][scope]["contributions"]} == set(schema["feature_names"])
    assert results[0]["cad"] != results[1]["cad"], "CAD prediction does not respond to profile changes"
    assert results[0]["vessels"] != results[1]["vessels"], "Vessel predictions do not respond to profile changes"
    assert results[0]["shap"]["cad"]["contributions"] != results[1]["shap"]["cad"]["contributions"]
    print(json.dumps({"origin": origin, "frontend": "ok", "models": health["models"],
                      "synthetic_profile_cad_probabilities": [result["cad"] for result in results],
                      "input_dependent_predictions_and_shap": "ok"}, indent=2))


if __name__ == "__main__":
    verify(sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8001")
