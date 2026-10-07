/**
 * Requirement 3b: interpretable breakdown of *why* the model predicted a
 * risk score — SHAP contributions rendered as a running-total waterfall.
 *
 * Scope follows the 3D selection (useShapScope), so clicking RCA in the
 * scene reframes both interpretation panels at once; with nothing selected
 * the panels explain the overall CAD prediction.
 *
 * Honesty constraints this component has to keep:
 *  - contributions are signed and stay labelled "+ raises predicted risk,
 *    − lowers it" (never "causes");
 *  - the bars sum the contributions shown — the model's base output is not
 *    part of that sum, so the total is labelled as a sum, not as the
 *    probability itself.
 */

import { usePrediction, useShapScope, useVesselSelector } from '../store/patientStore'
import { VESSEL_META } from '../vessels'

/** Top-N shown; SHAP can rank all 54 features, which does not fit a panel. */
const MAX_ROWS = 8

export function ShapWaterfall() {
  const prediction = usePrediction()
  const scope = useShapScope()
  const { selectVessel } = useVesselSelector()

  const breakdown = prediction?.shap[scope]
  const contributions = (breakdown?.contributions ?? []).slice(0, MAX_ROWS)
  const hidden = (breakdown?.contributions.length ?? 0) - contributions.length

  // Prefix sums rather than an accumulating loop: the whole figure is a
  // pure function of the contributions, so nothing mutates during render.
  const totals = contributions.map((_, index) =>
    contributions
      .slice(0, index + 1)
      .reduce((sum, entry) => sum + entry.value, 0),
  )
  const running = totals[totals.length - 1] ?? 0
  const positions = [0, ...totals]
  const steps = contributions.map((entry, index) => ({
    entry,
    from: index === 0 ? 0 : totals[index - 1],
    to: totals[index],
  }))

  const lo = Math.min(...positions)
  const hi = Math.max(...positions)
  const span = hi - lo || 1
  const pad = span * 0.1
  const min = lo - pad
  const width = span + 2 * pad
  const scale = (value: number) => ((value - min) / width) * 100

  const scopeLabel =
    scope === 'cad' ? 'Overall CAD' : `${scope} · ${VESSEL_META[scope].name}`

  return (
    <section
      aria-label="Prediction explanation"
      className="rounded-xl border border-mist bg-white p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-navy">
            Why this prediction
          </h2>
          <p className="mt-0.5 text-[10px] text-slate">
            SHAP contribution to <strong className="text-navy">{scopeLabel}</strong>
          </p>
        </div>
        {scope !== 'cad' && (
          <button
            type="button"
            onClick={() => selectVessel(null)}
            className="shrink-0 rounded-md border border-mist px-2 py-1 text-[11px] text-slate transition hover:border-navy/40 hover:text-navy"
          >
            Overall only
          </button>
        )}
      </div>

      {!breakdown || contributions.length === 0 ? (
        <p className="mt-3 text-[11px] text-slate">
          No contribution data for this prediction yet.
        </p>
      ) : (
        <>
          <p className="mt-2 text-[10px] leading-relaxed text-slate">
            + raises the predicted risk · − lowers it. Bars accumulate left to
            right into the sum below.
          </p>

          <div className="relative mt-3">
            <span
              aria-hidden
              className="absolute inset-y-0 w-px bg-navy/25"
              style={{ left: `${scale(0)}%` }}
            />
            <ul className="space-y-1.5">
              {steps.map(({ entry, from, to }) => {
                const start = scale(Math.min(from, to))
                const end = scale(Math.max(from, to))
                const positive = entry.value >= 0
                return (
                  <li key={entry.feature} className="flex items-center gap-2">
                    <span className="w-[42%] truncate text-[11px] text-navy">
                      {entry.feature}
                    </span>
                    <span className="relative h-3.5 flex-1 rounded-sm bg-mist/70">
                      <span
                        className="absolute inset-y-0 rounded-sm"
                        style={{
                          left: `${start}%`,
                          width: `${Math.max(end - start, 0.6)}%`,
                          backgroundColor: positive ? '#e74c3c' : '#27ae60',
                        }}
                      />
                    </span>
                    <span className="w-12 text-right text-[11px] font-semibold tabular-nums text-slate">
                      {positive ? '+' : ''}
                      {entry.value.toFixed(2)}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-mist px-2.5 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate">
              Sum of contributions
            </span>
            <span className="text-sm font-bold tabular-nums text-navy">
              {running >= 0 ? '+' : ''}
              {running.toFixed(2)}
            </span>
          </div>

          <p className="mt-2 text-[10px] leading-relaxed text-slate">
            Model confidence: <strong className="text-navy">{breakdown.label}</strong>.
            {hidden > 0 && ` ${hidden} smaller contributions not shown.`} Sum of
            contributions only — the model's baseline output is not included.
          </p>
        </>
      )}
    </section>
  )
}
