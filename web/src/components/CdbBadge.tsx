/**
 * Requirement 3a's overall reading: predicted CAD status, displayed beside
 * the 3D canvas (not buried in a tooltip — the requirement's word is
 * "alongside").
 *
 * The badge is deliberately plain: a probability, the reserved risk colour
 * and the band label. Nothing here may read as a diagnosis, which is why the
 * band wording stays "predicted" and the disclaimer sits in the panel footer.
 */

import { riskBand, riskColor, riskLabel } from '../vessels'

const NEUTRAL = '#9aa7b2'

interface CdbBadgeProps {
  /** Probability of CAD in 0..1, or null while loading. */
  value: number | null
}

export function CdbBadge({ value }: CdbBadgeProps) {
  const color = value === null ? NEUTRAL : riskColor(value)
  const label = value === null ? 'Awaiting prediction' : riskLabel(riskBand(value))

  return (
    <div className="rounded-lg border border-mist bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate">
          CAD status (overall)
        </p>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ backgroundColor: `${color}22`, color }}
        >
          {label}
        </span>
      </div>

      <div className="mt-2 flex items-end gap-2">
        <span
          className="text-3xl font-bold leading-none tabular-nums text-navy"
          aria-label="predicted CAD probability"
        >
          {value === null ? '—' : `${Math.round(value * 100)}%`}
        </span>
        <span className="pb-0.5 text-[11px] text-slate">
          predicted probability
        </span>
      </div>

      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-mist">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: value === null ? '0%' : `${Math.round(value * 100)}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  )
}
