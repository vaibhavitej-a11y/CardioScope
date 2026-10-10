"""Cross-artifact parity gates: the API schema, the trained artifact schema
and the frontend catalogue must describe the same 54 features — drift in
any of the three fails here before it fails a patient."""
from __future__ import annotations

import json
import re
import typing
from pathlib import Path

from app.constants import DISCLAIMER_TEXT
from app.schemas import PatientInput

REPO = Path(__file__).resolve().parents[2]
ART = REPO / "ml" / "artifacts"


def _alias_index() -> dict[str, object]:
    return {
        field.alias: field for field in PatientInput.model_fields.values()
    }


def test_schema_covers_exactly_54_features(schema):
    aliases = set(_alias_index())
    assert aliases == set(schema["feature_names"])
    assert len(aliases) == 54


def test_leakage_targets_absent_from_model(schema):
    banned = {"Cath", "LAD", "LCX", "RCA", "Exertional CP"}
    assert not banned & set(_alias_index())


def test_categorical_literals_match_artifact(schema):
    fields = _alias_index()
    for name, allowed in schema["categorical_features"].items():
        args = set(typing.get_args(fields[name].annotation))
        assert args == set(allowed), name


def test_numeric_features_are_float(schema):
    fields = _alias_index()
    for name in schema["numeric_features"]:
        assert fields[name].annotation is float, name


def test_frontend_catalogue_matches_artifact(schema):
    """features.ts num()/cat() kind must equal the artifact's numeric /
    categorical split — a mismatch means the form would send values the
    OneHotEncoder was never fitted on."""
    ts = (REPO / "web" / "src" / "api" / "features.ts").read_text(
        encoding="utf-8"
    )
    found = {
        name: kind
        for kind, name in re.findall(r"(num|cat)\('([^']+)'", ts)
    }
    expected = {name: "num" for name in schema["numeric_features"]}
    expected.update({name: "cat" for name in schema["categorical_features"]})
    assert found == expected


def test_frontend_disclaimer_matches_api():
    ts = (
        REPO / "web" / "src" / "components" / "DisclaimerBanner.tsx"
    ).read_text(encoding="utf-8")
    match = re.search(r"DISCLAIMER_TEXT\s*=\s*'([^']+)'", ts)
    assert match, "DISCLAIMER_TEXT not found in DisclaimerBanner.tsx"
    assert match.group(1) == DISCLAIMER_TEXT
