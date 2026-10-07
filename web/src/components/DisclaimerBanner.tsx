/**
 * Requirement 5 — clinical safety disclaimer, placement 1 of 3 (banner).
 *
 * The spec requires "clear, visible visual disclaimers". One placement is
 * not enough to be unmissable, so this renders as a persistent top banner;
 * DisclaimerModal covers first launch and the page footer covers scroll.
 *
 * TODO(M2): once `api/app/constants.py` exists, this string should come from
 * GET /api/config so backend and frontend cannot drift. Until then this file
 * is the single frontend source of truth — do not restate the sentence
 * anywhere else.
 */

export const DISCLAIMER_TEXT =
  'For decision support / educational purposes only — not a substitute for formal diagnostic imaging.'

export function DisclaimerBanner() {
  return (
    <div
      role="note"
      className="border-b border-risk-high/30 bg-risk-high/10 px-4 py-2 text-center text-xs font-semibold text-risk-high"
    >
      {DISCLAIMER_TEXT}
    </div>
  )
}
