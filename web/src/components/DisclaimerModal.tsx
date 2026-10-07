/**
 * Requirement 5 — clinical safety disclaimer, placement 2 of 3 (startup modal).
 *
 * Blocks the first render until the user acknowledges, so nobody interacts
 * with the model before reading it. Subsequent renders are skipped via the
 * store flag; navigation within the session does not re-prompt.
 */

import { usePatientStore } from '../store/patientStore'
import { DISCLAIMER_TEXT } from './DisclaimerBanner'

export function DisclaimerModal() {
  const dismissed = usePatientStore((s) => s.disclaimerDismissed)
  const dismiss = usePatientStore((s) => s.dismissDisclaimer)

  if (dismissed) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/55 p-6"
    >
      <div className="w-full max-w-md rounded-xl border border-risk-high/30 bg-white p-6 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-risk-high">
          Clinical safety notice
        </p>
        <h2 id="disclaimer-title" className="mt-2 text-lg font-semibold text-navy">
          Decision support only
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate">
          {DISCLAIMER_TEXT}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate">
          All values shown are model <strong className="text-navy">predictions</strong>
          derived from a public research dataset of 303 patients. They are not
          measurements, diagnoses or imaging findings.
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="mt-5 w-full rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
        >
          I understand — continue
        </button>
      </div>
    </div>
  )
}
