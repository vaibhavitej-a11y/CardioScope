import { Html } from '@react-three/drei'
import type { RefObject } from 'react'
import type { VesselId } from '../api/types'
import { VESSELS, VESSEL_META } from '../vessels'
import { vesselPointAt } from './curve'
import { probabilityPercent } from '../api/format'

interface VesselLabelsProps {
  portal: RefObject<HTMLDivElement | null>
  probabilities: Record<VesselId, number | null>
  colors: Record<VesselId, string>
  selectedVessel: VesselId | null
  onSelect: (vessel: VesselId) => void
  riskMap: boolean
}

export function VesselLabels({ portal, probabilities, colors, selectedVessel, onSelect, riskMap }: VesselLabelsProps) {
  return <group>{VESSELS.map(vessel => {
    const anchor = vesselPointAt(vessel, vessel === 'LAD' ? 0.58 : 0.25)
    const probability = probabilities[vessel]
    const selected = selectedVessel === vessel
    const left = vessel === 'RCA'
    return <Html key={vessel} portal={portal as unknown as RefObject<HTMLElement>} position={[anchor.x, anchor.y, anchor.z]} center zIndexRange={[20, 0]} className="vessel-label-anchor" style={{ pointerEvents: 'none' }}>
      <button type="button" className={`vessel-label-button ${left ? 'vessel-label-left' : 'vessel-label-right'}`} style={{ transform: `translate(${left ? '-80%' : '80%'}, ${vessel === 'LAD' ? '20px' : '-15px'})` }} onClick={() => onSelect(vessel)} aria-label={`Inspect ${VESSEL_META[vessel].name}`} aria-pressed={selected}>
        <span className="vessel-label-line" />
        <span className={`vessel-label ${selected ? 'is-selected' : ''}`}><i style={{ background: colors[vessel] }} /><strong>{vessel}</strong>{riskMap && <span>{probability === null ? '—' : `${probabilityPercent(probability)}%`}</span>}</span>
      </button>
    </Html>
  })}</group>
}
