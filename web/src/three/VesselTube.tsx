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
 * suggests blood flow without a postprocessing pass or particle system.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useCursor } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { VesselId } from '../api/types'
import { getVesselCurve } from './curve'
import { injectFlow } from './flow'
import { CORONARY_BRANCHES, branchPoints } from '../vessels'
import { taperedTube } from './taperedTube'

interface VesselTubeProps {
  vessel: VesselId
  /** Fill colour already mapped from probability by riskColor(). */
  color: string
  selected: boolean
  onSelect: (vessel: VesselId) => void
  animate?: boolean
}

const REST_RADIUS = 0.034
const SELECTED_RADIUS = 0.043

export function VesselTube({
  vessel,
  color,
  selected,
  onSelect,
  animate = true,
}: VesselTubeProps) {
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)

  const uFlow = useRef({ value: 0 })
  useFrame((state) => {
    uFlow.current.value = animate ? state.clock.elapsedTime : 0
  })

  const geometry = useMemo(() => {
    const curve = getVesselCurve(vessel)
    return taperedTube(curve, selected ? SELECTED_RADIUS : REST_RADIUS, 110, 12)
  }, [vessel, selected])

  const branches = useMemo(() => CORONARY_BRANCHES[vessel].map((_, i) => {
    const curve = new THREE.CatmullRomCurve3(branchPoints(vessel, i).map(p => new THREE.Vector3(...p)))
    return taperedTube(curve, selected ? 0.021 : 0.017, 50, 8)
  }), [vessel, selected])
  useEffect(() => () => branches.forEach(branch => branch.dispose()), [branches])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <group
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
      {[geometry, ...branches].map((shape, index) => <mesh key={index} geometry={shape}><meshPhysicalMaterial
        color={color}
        roughness={0.45}
        metalness={0}
        clearcoat={0.45}
        clearcoatRoughness={0.2}
        envMapIntensity={0.6}
        emissive={color}
        emissiveIntensity={selected ? 0.35 : hovered ? 0.22 : 0.1}
        onBeforeCompile={(shader) =>
          injectFlow(shader, uFlow.current, {
            repeat: 3,
            speed: 0.5,
            tint: [1, 0.96, 0.9],
            strength: animate ? 0.18 : 0,
          })
        }
      /></mesh>)}
    </group>
  )
}
