/**
 * Requirement 5 — clinical safety disclaimer, placement 1 of 3 (banner).
 *
 * The spec requires "clear, visible visual disclaimers". One placement is
 * not enough to be unmissable, so this renders as a persistent top banner;
 * DisclaimerModal covers first launch and the page footer covers scroll.
 *
 * The matching backend source of truth is `api/app/constants.py`
 * (exposed via GET /api/config). Drift between the two is blocked by
 * `api/tests/test_schema_parity.py`, which fails if the strings ever
 * differ — so keep edits in lockstep.
 */

export const DISCLAIMER_TEXT =
  'For decision support / educational purposes only — not a substitute for formal diagnostic imaging.'

export function DisclaimerBanner() {
  return (
    <div
      role="note"
      className="border-b border-risk-high/40 bg-risk-high/15 px-4 py-2 text-center text-xs font-semibold text-risk-high"
    >
      {DISCLAIMER_TEXT}
    </div>
  )
}
