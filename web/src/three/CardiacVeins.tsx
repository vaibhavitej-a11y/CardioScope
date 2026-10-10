/**
 * Cardiac venous return — the great cardiac vein beside the LAD and the
 * coronary sinus around the posterior AV groove.
 *
 * Anatomical context only: static tubes, no picking, never risk-coloured
 * (steel-blue — red stays reserved for predicted risk). They live inside
 * OrganGroup like the coronaries, so they beat and tilt with the muscle.
 * The same flow band as the arteries runs slower and cool-tinted, which
 * reads as venous return rather than arterial inflow.
 */

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CARDIAC_VEINS } from '../vessels'
import { injectFlow } from './flow'

export function CardiacVeins() {
  const uFlow = useRef({ value: 0 })

  const items = useMemo(
    () =>
      CARDIAC_VEINS.map((vein) => {
        const curve = new THREE.CatmullRomCurve3(
          vein.points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
        )
        return {
          vein,
          geometry: new THREE.TubeGeometry(curve, 96, vein.radius, 10, false),
        }
      }),
    [],
  )

  useEffect(
    () => () => items.forEach((item) => item.geometry.dispose()),
    [items],
  )

  useFrame((state) => {
    uFlow.current.value = state.clock.elapsedTime
  })

  return (
    <group>
      {items.map(({ vein, geometry }) => (
        <mesh key={vein.name} geometry={geometry}>
          <meshPhysicalMaterial
            color={vein.color}
            roughness={0.3}
            metalness={0}
            clearcoat={1}
            clearcoatRoughness={0.25}
            envMapIntensity={1.2}
            emissive={vein.color}
            emissiveIntensity={0.45}
            onBeforeCompile={(shader) =>
              injectFlow(shader, uFlow.current, {
                repeat: 2,
                speed: 0.3,
                tint: [0.7, 0.88, 1],
                strength: 0.6,
              })
            }
          />
        </mesh>
      ))}
    </group>
  )
}
