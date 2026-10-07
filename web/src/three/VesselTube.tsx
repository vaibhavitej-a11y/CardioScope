/**
 * Coronary artery tubes — requirement 2b ("dynamically update the color-code
 * of individual coronary artery nodes ... based on predicted stenosis
 * probabilities").
 *
 * The colour is derived on every render from the current prediction, so a
 * new value reaching the store repaints the vessel with no scene rebuild.
 * Decision D3: tubes are the readable half of the requirement; VesselNode
 * supplies the literal "nodes".
 */

import { useEffect, useMemo, useState } from 'react'
import { useCursor } from '@react-three/drei'
import * as THREE from 'three'
import type { VesselId } from '../api/types'
import { getVesselCurve } from './curve'

interface VesselTubeProps {
  vessel: VesselId
  /** Fill colour already mapped from probability by riskColor(). */
  color: string
  selected: boolean
  onSelect: (vessel: VesselId) => void
}

const REST_RADIUS = 0.038
const SELECTED_RADIUS = 0.052

export function VesselTube({
  vessel,
  color,
  selected,
  onSelect,
}: VesselTubeProps) {
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)

  const geometry = useMemo(() => {
    const curve = getVesselCurve(vessel)
    return new THREE.TubeGeometry(
      curve,
      110,
      selected ? SELECTED_RADIUS : REST_RADIUS,
      12,
      false,
    )
  }, [vessel, selected])

  useEffect(() => () => geometry.dispose(), [geometry])

  const lit = selected || hovered

  return (
    <mesh
      geometry={geometry}
      onPointerOver={(event) => {
        event.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
      onClick={(event) => {
        event.stopPropagation()
        onSelect(vessel)
      }}
    >
      <meshStandardMaterial
        color={color}
        roughness={0.42}
        metalness={0.08}
        emissive={lit ? color : '#000000'}
        emissiveIntensity={selected ? 0.55 : hovered ? 0.3 : 0}
      />
    </mesh>
  )
}
