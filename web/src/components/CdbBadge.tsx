/**
 * Requirement 3a's overall reading: predicted CAD status, displayed beside
 * the 3D canvas (not buried in a tooltip — the requirement's word is
 * "alongside").
 *
 * A donut gauge rather than a second percentage bar: the GaugeCards below
 * already carry bars, so the overall reading gets its own visual language
 * and no shape is repeated in one strip. Nothing here may read as a
 * diagnosis, which is why the band wording stays "predicted" and the
 * disclaimer sits in the panel footer.
 */

import { riskBand, riskColor, riskLabel } from '../vessels'

const NEUTRAL = '#9aa7b2'

const RING_RADIUS = 26
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

interface CdbBadgeProps {
  /** Probability of CAD in 0..1, or null while loading. */
  value: number | null
}

export function CdbBadge({ value }: CdbBadgeProps) {
  const color = value === null ? NEUTRAL : riskColor(value)
  const label = value === null ? 'Awaiting prediction' : riskLabel(riskBand(value))

  return (
    <div className="rounded-lg border border-mist bg-panel p-3 ring-1 ring-white/5">
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

      <div className="mt-2 flex items-center gap-3">
        <svg
          viewBox="0 0 64 64"
          className="size-16 shrink-0 -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx="32"
            cy="32"
            r={RING_RADIUS}
            fill="none"
            stroke="#0a1120"
            strokeWidth="7"
          />
          <circle
            cx="32"
            cy="32"
            r={RING_RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE * (1 - (value ?? 0))}
            className="transition-[stroke-dashoffset] duration-700"
          />
        </svg>
        <div className="min-w-0">
          <span
            className="block text-3xl font-bold leading-none tabular-nums text-navy"
            aria-label="predicted CAD probability"
          >
            {value === null ? '—' : `${Math.round(value * 100)}%`}
          </span>
          <span className="mt-1 block text-[11px] text-slate">
            predicted probability
          </span>
        </div>
      </div>
    </div>
  )
}
