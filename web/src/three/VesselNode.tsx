/**
 * Clickable vessel nodes — requirement 2b's literal wording: *"individual
 * coronary artery nodes (LAD, LCX, RCA)"*.
 *
 * Decision D3: nodes sit on top of the tubes rather than replacing them.
 * Three per vessel (NODE_FRACTIONS), giving nine obvious hit targets so
 * requirement 2c's "select anatomical regions" has something to click.
 */

import { useState } from 'react'
import { useCursor } from '@react-three/drei'
import type { VesselId } from '../api/types'

interface VesselNodeProps {
  vessel: VesselId
  position: [number, number, number]
  color: string
  selected: boolean
  onSelect: (vessel: VesselId) => void
}

const RADIUS = 0.05

export function VesselNode({
  vessel,
  position,
  color,
  selected,
  onSelect,
}: VesselNodeProps) {
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)

  const scale = selected ? 1.55 : hovered ? 1.25 : 1

  return (
    <mesh
      position={position}
      scale={scale}
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
      <sphereGeometry args={[RADIUS, 18, 14]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={selected ? 0.8 : 0.35}
        roughness={0.3}
        metalness={0.1}
      />
    </mesh>
  )
}
