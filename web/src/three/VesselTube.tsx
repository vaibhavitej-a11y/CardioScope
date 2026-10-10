/**
 * Coronary artery tubes — requirement 2b ("dynamically update the color-code
 * of individual coronary artery nodes ... based on predicted stenosis
 * probabilities").
 *
 * The colour is derived on every render from the current prediction, so a
 * new value reaching the store repaints the vessel with no scene rebuild.
 * Decision D3: tubes are the readable half of the requirement; VesselNode
 * supplies the literal "nodes".
 *
 * A bright flow band scrolls base → apex along the tube (injectFlow) and
 * feeds the bloom pass — blood in motion without particles, which opaque
 * tubes would occlude anyway.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useCursor } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { VesselId } from '../api/types'
import { getVesselCurve } from './curve'
import { injectFlow } from './flow'

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

  const uFlow = useRef({ value: 0 })
  useFrame((state) => {
    uFlow.current.value = state.clock.elapsedTime
  })

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
      <meshPhysicalMaterial
        color={color}
        roughness={0.32}
        metalness={0}
        clearcoat={1}
        clearcoatRoughness={0.2}
        envMapIntensity={1.3}
        emissive={color}
        emissiveIntensity={selected ? 0.9 : hovered ? 0.5 : 0.3}
        onBeforeCompile={(shader) =>
          injectFlow(shader, uFlow.current, {
            repeat: 3,
            speed: 0.5,
            tint: [1, 0.96, 0.9],
            strength: 0.9,
          })
        }
      />
    </mesh>
  )
}
