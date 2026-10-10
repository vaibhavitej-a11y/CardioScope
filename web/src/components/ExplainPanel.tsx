/**
 * Requirements 2c + 3b + 3c in one panel — "why this prediction", scoped to
 * the 3D selection.
 *
 * Replaces the former ShapWaterfall + FeatureContribution + VesselDetailPanel
 * trio: all three rendered the same SHAP numbers, so a judge reading the rail
 * saw each contribution up to three times. Here one row per feature carries
 * everything once — the feature, the patient's measurement, and the signed
 * contribution with its direction.
 *
 * What this panel deliberately does NOT repeat:
 *  - the probability / band — CdbBadge (overall) and the GaugeCards (per
 *    vessel) own those, and the 3D pill shows the selected vessel's value
 *    on the model itself;
 *  - disclaimer text — banner, modal and footer already carry it.
 *
 * Honity rules kept verbatim from the old panels: contributions are signed
 * "+ raises predicted risk, − lowers it" (never "causes"), the sum covers
 * only the rows shown, and the baseline output is not part of that sum.
 */

import {
  usePatientStore,
  usePrediction,
  useShapScope,
  useVesselSelector,
} from '../store/patientStore'
import { findFeature, formatFeatureValue } from '../api/features'
import { VESSEL_META } from '../vessels'

/** Top-N rows; SHAP ranks all 54 features, which does not fit a rail. */
const MAX_ROWS = 6

export function ExplainPanel() {
  const prediction = usePrediction()
  const scope = useShapScope()
  const inputs = usePatientStore((s) => s.inputs)
  const { selectVessel } = useVesselSelector()

  const breakdown = prediction?.shap[scope]
  const rows = (breakdown?.contributions ?? []).slice(0, MAX_ROWS)
  const total = breakdown?.contributions.length ?? 0
  const maxAbs =
    rows.reduce((max, entry) => Math.max(max, Math.abs(entry.value)), 0) || 1
  const sum = rows.reduce((acc, entry) => acc + entry.value, 0)

  const vessel = scope === 'cad' ? null : scope

  return (
    <section
      aria-label="Prediction explanation"
      className="rounded-xl border border-mist bg-panel p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate">
            {vessel ? 'Selected vessel' : 'Overall CAD'}
          </p>
          <h2 className="mt-0.5 text-sm font-semibold text-navy">
            {vessel ? vessel : 'Why this prediction'}
          </h2>
          {vessel ? (
            <p className="mt-0.5 text-[11px] leading-snug text-slate">
              {VESSEL_META[vessel].name} — supplies the{' '}
              <strong className="text-navy">{VESSEL_META[vessel].supplies}</strong>
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] text-slate">
              Top contributions to the CAD prediction
            </p>
          )}
        </div>
        {vessel && (
          <button
            type="button"
            onClick={() => selectVessel(null)}
            className="shrink-0 rounded-md border border-mist px-2 py-1 text-[11px] text-slate transition hover:border-accent/60 hover:text-accent"
          >
            Clear
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 text-[11px] text-slate">
          No contribution data for this prediction yet.
        </p>
      ) : (
        <>
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
                      className="shrink-0 rounded bg-mist px-1.5 py-0.5 text-[11px] tabular-nums text-slate"
                      title={measured === '—' ? 'not entered' : undefined}
                    >
                      {measured}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center gap-2">
                    <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-well">
                      <span
                        aria-hidden
                        className="absolute inset-y-0 left-1/2 w-px bg-navy/30"
                      />
                      <span
                        aria-hidden
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

          <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-mist/70 px-2.5 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate">
              Sum of shown
            </span>
            <span className="text-sm font-bold tabular-nums text-navy">
              {sum >= 0 ? '+' : ''}
              {sum.toFixed(3)}
            </span>
          </div>

          <p className="mt-2 text-[10px] leading-relaxed text-slate">
            Top {rows.length} of {total} contributions. + raises predicted
            risk, − lowers it — model attribution, not a causal effect; the
            model's baseline output is not part of the sum. Values are
            predictions, not measurements.
          </p>
        </>
      )}

      {!vessel && (
        <p className="mt-3 border-t border-mist pt-2 text-[10px] leading-relaxed text-slate">
          Click a vessel tube or node in the 3D view for its drivers. Drag to
          rotate · scroll to zoom · click empty space to deselect.
        </p>
      )}
    </section>
  )
}
