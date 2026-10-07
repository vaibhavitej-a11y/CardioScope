/**
 * Overall CAD status + the three vessel probabilities, always visible beside
 * the 3D canvas — requirement 3a.
 *
 * STUB: this is the §2c/§3a readout so the scene is demoable on its own.
 * M4 replaces it with the full CdbBadge + GaugeCard set; the store shape and
 * the colour mapping are the contract, not this layout.
 *
 * TODO(M4): expand into components/CdbBadge.tsx and components/GaugeCard.tsx.
 */

import {
  usePatientStore,
  usePrediction,
  useVesselSelector,
} from '../store/patientStore'
import type { VesselId } from '../api/types'
import {
  VESSELS,
  VESSEL_META,
  riskBand,
  riskColor,
  riskLabel,
} from '../vessels'

const NEUTRAL = '#9aa7b2'

function formatPct(value: number): string {
  return `${Math.round(value * 100)}%`
}

interface CardProps {
  title: string
  subtitle?: string
  value: number | null
  active: boolean
  onClick?: () => void
}

function ProbabilityCard({
  title,
  subtitle,
  value,
  active,
  onClick,
}: CardProps) {
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
    'rounded-lg border bg-white p-2.5 text-left transition',
    active
      ? 'border-navy ring-1 ring-navy/25'
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

export function RiskStrip() {
  const prediction = usePrediction()
  const status = usePatientStore((s) => s.status)
  const error = usePatientStore((s) => s.error)
  const { selectedVessel, selectVessel } = useVesselSelector()

  const cad = prediction?.cad ?? null
  const toggle = (vessel: VesselId) =>
    selectVessel(selectedVessel === vessel ? null : vessel)

  return (
    <section aria-label="Predicted risk" className="grid grid-cols-2 gap-2">
      <ProbabilityCard title="CAD (overall)" value={cad} active={false} />

      {VESSELS.map((vessel) => (
        <ProbabilityCard
          key={vessel}
          title={vessel}
          subtitle="predicted stenosis"
          value={prediction?.vessels[vessel] ?? null}
          active={selectedVessel === vessel}
          onClick={() => toggle(vessel)}
        />
      ))}

      {status === 'loading' && prediction === null && (
        <p className="col-span-2 text-[11px] text-slate">
          Running prediction…
        </p>
      )}
      {status === 'error' && (
        <p className="col-span-2 text-[11px] text-risk-high">{error}</p>
      )}
      <p className="col-span-2 text-[10px] text-slate">
        Values are model predictions, not measurements.{' '}
        {VESSELS.map((v) => VESSEL_META[v].name).join(' · ')}.
      </p>
    </section>
  )
}
