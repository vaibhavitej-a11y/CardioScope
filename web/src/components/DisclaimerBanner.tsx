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
      className="disclaimer-banner"
    >
      <span className="disclaimer-symbol" aria-hidden="true">i</span>
      <span>{DISCLAIMER_TEXT}</span>
      <span className="disclaimer-label">RESEARCH USE</span>
    </div>
  )
}
