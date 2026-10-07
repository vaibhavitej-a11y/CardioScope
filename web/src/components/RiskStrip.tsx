/**
 * Requirement 3a: overall CAD status and the three vessel-specific
 * probabilities, always visible beside the 3D canvas.
 *
 * Composition only — the reading itself lives in CdbBadge (overall) and
 * GaugeCard (per vessel), which is what the traceability doc names as the
 * §3a components.
 */

import {
  usePatientStore,
  usePrediction,
  useVesselSelector,
} from '../store/patientStore'
import type { VesselId } from '../api/types'
import { USE_MOCK } from '../api/client'
import { VESSELS, VESSEL_META } from '../vessels'
import { CdbBadge } from './CdbBadge'
import { GaugeCard } from './GaugeCard'

export function RiskStrip() {
  const prediction = usePrediction()
  const status = usePatientStore((s) => s.status)
  const error = usePatientStore((s) => s.error)
  const { selectedVessel, selectVessel } = useVesselSelector()

  const toggle = (vessel: VesselId) =>
    selectVessel(selectedVessel === vessel ? null : vessel)

  return (
    <section aria-label="Predicted risk" className="space-y-2">
      <CdbBadge value={prediction?.cad ?? null} />

      <div className="grid grid-cols-3 gap-2">
        {VESSELS.map((vessel) => (
          <GaugeCard
            key={vessel}
            title={vessel}
            subtitle="predicted stenosis"
            value={prediction?.vessels[vessel] ?? null}
            active={selectedVessel === vessel}
            onClick={() => toggle(vessel)}
          />
        ))}
      </div>

      {status === 'loading' && prediction === null && (
        <p className="text-[11px] text-slate">Running prediction…</p>
      )}
      {status === 'error' && (
        <p className="text-[11px] text-risk-high">{error}</p>
      )}

      <p className="text-[10px] leading-relaxed text-slate">
        Values are model predictions, not measurements.{' '}
        {VESSELS.map((v) => VESSEL_META[v].name).join(' · ')}.
        {USE_MOCK && (
          <span className="ml-1 rounded bg-mist px-1 py-0.5 font-semibold text-slate">
            demo data — model service not connected
          </span>
        )}
      </p>
    </section>
  )
}
