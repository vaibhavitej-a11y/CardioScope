/**
 * Requirement 3a: a vessel-specific probability gauge shown alongside the 3D
 * canvas. Rendered three times (LAD / LCX / RCA) by RiskStrip, and reused for
 * the overall CAD reading in CdbBadge.
 *
 * Colour comes from riskColor(), which ramps between the spec's three
 * anchors — GREEN normal / AMBER uncertain / RED stenotic. Those hues are
 * reserved for risk, never for generic success or error states.
 */

import { riskBand, riskColor, riskLabel } from '../vessels'

const NEUTRAL = '#9aa7b2'

function formatPct(value: number): string {
  return `${Math.round(value * 100)}%`
}

interface GaugeCardProps {
  title: string
  /** Optional qualifier rendered under the bar, e.g. "predicted stenosis". */
  subtitle?: string
  /** Probability in 0..1, or null while no prediction has arrived. */
  value: number | null
  /** Marks the gauge for the vessel currently selected in the 3D scene. */
  active: boolean
  onClick?: () => void
}

export function GaugeCard({
  title,
  subtitle,
  value,
  active,
  onClick,
}: GaugeCardProps) {
  const color = value === null ? NEUTRAL : riskColor(value)
  const label = value === null ? '—' : riskLabel(riskBand(value))

  const body = (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold text-navy">{title}</span>
        <span className="text-base font-bold tabular-nums text-navy">
          {value === null ? '—' : formatPct(value)}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-mist">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: value === null ? '0%' : formatPct(value),
            backgroundColor: color,
          }}
        />
      </div>
      <div className="mt-1 text-[10px] font-medium text-slate">
        {subtitle ? `${subtitle} · ` : ''}
        {label}
      </div>
    </>
  )

  const className = [
    'rounded-lg border bg-panel p-2.5 text-left transition ring-1 ring-white/5',
    active
      ? 'border-accent/70 ring-accent/30'
      : 'border-mist hover:border-navy/40',
  ].join(' ')

  if (!onClick) {
    return <div className={className}>{body}</div>
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {body}
    </button>
  )
}
