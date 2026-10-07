/**
 * Vessel-specific risk detail — requirement 2c ("select anatomical regions
 * to inspect localized/vessel-specific risk detail") plus the first half of
 * requirement 3b (why the model predicted it).
 *
 * Selection is vessel-level only: the dataset carries no pixel or 3D lesion
 * location (Region RWMA is a label, not a coordinate), so finer granularity
 * would be inventing detail we must not claim. See decision D4.
 *
 * TODO(M4): the full §3b/§3c panels (ShapWaterfall, FeatureContribution)
 * still to come — this shows the top contributors for the selected vessel.
 */

import { usePrediction, useVesselSelector } from '../store/patientStore'
import { VESSEL_META, riskBand, riskColor, riskLabel } from '../vessels'

const TOP_CONTRIBUTORS = 3

export function VesselDetailPanel() {
  const prediction = usePrediction()
  const { selectedVessel, selectVessel } = useVesselSelector()

  if (!selectedVessel) {
    return (
      <section
        aria-label="Vessel detail"
        className="rounded-xl border border-mist bg-white p-4"
      >
        <h2 className="text-sm font-semibold text-navy">Vessel detail</h2>
        <p className="mt-2 text-xs leading-relaxed text-slate">
          Select a coronary artery in the 3D view — click a vessel tube or one
          of the nine node markers — to inspect its predicted stenosis
          probability and what drove it.
        </p>
        <p className="mt-2 text-[11px] text-slate">
          Drag to rotate · scroll to zoom · click empty space to deselect.
        </p>
      </section>
    )
  }

  const meta = VESSEL_META[selectedVessel]
  const probability = prediction?.vessels[selectedVessel] ?? null
  const color =
    probability === null ? '#9aa7b2' : riskColor(probability)
  const band = probability === null ? null : riskBand(probability)
  const breakdown = prediction?.shap[selectedVessel] ?? null

  return (
    <section
      aria-label="Vessel detail"
      className="rounded-xl border border-mist bg-white p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate">
            Selected vessel
          </p>
          <h2 className="mt-0.5 text-lg font-bold text-navy">
            {selectedVessel}
          </h2>
          <p className="text-xs text-slate">{meta.name}</p>
        </div>
        <button
          type="button"
          onClick={() => selectVessel(null)}
          aria-label="Clear selection"
          className="rounded-md border border-mist px-2 py-1 text-xs text-slate transition hover:border-navy/40 hover:text-navy"
        >
          Clear
        </button>
      </div>

      <p className="mt-3 text-xs text-slate">
        Supplies the <strong className="text-navy">{meta.supplies}</strong>.
      </p>

      <div className="mt-3 flex items-center gap-3 rounded-lg border border-mist p-3">
        <span
          className="size-8 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-slate">
            Predicted stenosis probability
          </p>
          <p className="text-xl font-bold tabular-nums text-navy">
            {probability === null ? '—' : `${Math.round(probability * 100)}%`}
          </p>
        </div>
        {band && (
          <span
            className="ml-auto shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold"
            style={{ backgroundColor: `${color}22`, color }}
          >
            {riskLabel(band)}
          </span>
        )}
      </div>

      {breakdown && breakdown.contributions.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-navy">
            Top contributors
          </p>
          <p className="text-[10px] text-slate">
            Signed SHAP contribution — + raises the predicted risk, − lowers it.
          </p>
          <ul className="mt-2 space-y-2">
            {breakdown.contributions.slice(0, TOP_CONTRIBUTORS).map((entry) => (
              <ContributionBar key={entry.feature} {...entry} />
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

interface ContributionProps {
  feature: string
  value: number
}

function ContributionBar({ feature, value }: ContributionProps) {
  const magnitude = Math.min(Math.abs(value) / 0.25, 1) * 50
  // Positive contributions raise predicted risk, so they take the palette's
  // risk-high; negative take risk-low. This is risk direction, not a
  // success/failure state — the reserved use of these colours still holds.
  const barColor = value >= 0 ? '#e74c3c' : '#27ae60'

  return (
    <li>
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-[11px] text-navy">{feature}</span>
        <span className="text-[11px] font-semibold tabular-nums text-slate">
          {value >= 0 ? '+' : ''}
          {value.toFixed(3)}
        </span>
      </div>
      <div className="relative mt-1 h-1.5 w-full overflow-hidden rounded-full bg-mist">
        <span
          className="absolute inset-y-0 left-1/2 w-px bg-navy/25"
          aria-hidden="true"
        />
        <span
          className="absolute inset-y-0 rounded-full"
          style={{
            backgroundColor: barColor,
            left: value >= 0 ? '50%' : `${50 - magnitude}%`,
            width: `${magnitude}%`,
          }}
        />
      </div>
    </li>
  )
}
