/**
 * Requirement 3c: physiological measurements displayed alongside their
 * relative contribution to the prediction.
 *
 * Each row pairs three things that are easy to conflate and must not be:
 * the feature, the value actually entered for the patient (measurement), and
 * the model's signed SHAP contribution for it. The measurement comes from
 * the form via the patient store; the contribution comes from the frozen
 * /api/predict contract. A missing input shows "—" rather than an invented
 * number.
 *
 * Shares useShapScope() with ShapWaterfall so both panels always explain the
 * same target.
 */

import { usePatientStore, usePrediction, useShapScope } from '../store/patientStore'
import { findFeature, formatFeatureValue } from '../api/features'

const MAX_ROWS = 6

export function FeatureContribution() {
  const prediction = usePrediction()
  const scope = useShapScope()
  const inputs = usePatientStore((s) => s.inputs)

  const breakdown = prediction?.shap[scope]
  const rows = (breakdown?.contributions ?? []).slice(0, MAX_ROWS)
  const maxAbs = rows.reduce((max, entry) => Math.max(max, Math.abs(entry.value)), 0) || 1

  return (
    <section
      aria-label="Measurements and contribution"
      className="rounded-xl border border-mist bg-white p-4"
    >
      <h2 className="text-sm font-semibold text-navy">
        Measurements &amp; contribution
      </h2>
      <p className="mt-0.5 text-[10px] leading-relaxed text-slate">
        The patient value used, next to how much it moved this prediction
        (positive raises the predicted risk, negative lowers it).
      </p>

      {rows.length === 0 ? (
        <p className="mt-3 text-[11px] text-slate">
          No contribution data for this prediction yet.
        </p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {rows.map((entry) => {
            const feature = findFeature(entry.feature)
            const raw = inputs[entry.feature] ?? inputs[feature?.name ?? '']
            const measured =
              raw === undefined ? '—' : formatFeatureValue(entry.feature, raw)
            const label = feature?.label ?? entry.feature
            const positive = entry.value >= 0
            const magnitude = (Math.abs(entry.value) / maxAbs) * 50

            return (
              <li key={entry.feature}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[11px] font-medium text-navy">
                    {label}
                  </span>
                  <span
                    className="shrink-0 rounded bg-mist px-1.5 py-0.5 text-[11px] tabular-nums text-navy"
                    title={measured === '—' ? 'not entered' : undefined}
                  >
                    {measured}
                  </span>
                </div>

                <div className="mt-1 flex items-center gap-2">
                  <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-mist">
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-1/2 w-px bg-navy/25"
                    />
                    <span
                      className="absolute inset-y-0 rounded-full"
                      style={{
                        backgroundColor: positive ? '#e74c3c' : '#27ae60',
                        left: positive ? '50%' : `${50 - magnitude}%`,
                        width: `${magnitude}%`,
                      }}
                    />
                  </span>
                  <span className="w-14 text-right text-[11px] font-semibold tabular-nums text-slate">
                    {positive ? '+' : ''}
                    {entry.value.toFixed(3)}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <p className="mt-3 text-[10px] leading-relaxed text-slate">
        Contribution is model attribution, not a causal effect. Values are
        predictions, not measurements.
      </p>
    </section>
  )
}
