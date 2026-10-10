"""Single source of truth for user-facing text served by the API.

Requirement 5 traceability: the disclaimer exists in exactly one place —
this file — and GET /api/config hands it to the frontend, so backend and
frontend cannot drift (web/src/components/DisclaimerBanner.tsx mirrors it;
api/tests/test_schema_parity.py fails if the two copies differ).
"""

DISCLAIMER_TEXT = (
    "For decision support / educational purposes only — "
    "not a substitute for formal diagnostic imaging."
)
