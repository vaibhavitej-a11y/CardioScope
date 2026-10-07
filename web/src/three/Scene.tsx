/**
 * Requirement 2a/2b/2c — the interactive 3D scene.
 *
 * Technical considerations this file is responsible for:
 *   · "responsive 3D interaction ... without requiring dedicated GPUs" —
 *     capped device pixel ratio, no shadows, no post-processing, no HDR
 *     environment map (nothing is fetched over the network), AdaptiveDpr
 *     steps the ratio down if the frame budget slips.
 *   · "consistent correspondence between model outputs and the displayed
 *     LAD, LCX, RCA structures" — every colour, label and hit target is
 *     keyed off the shared VESSELS list in ../vessels.
 *
 * Rendering lives here; the prediction fetch does not — App owns that.
 */

import { useCallback, useMemo } from 'react'
import type { RefObject } from 'react'
import { AdaptiveDpr, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import type { VesselId } from '../api/types'
import { usePrediction, useVesselSelector } from '../store/patientStore'
import { NODE_FRACTIONS, VESSELS, riskColor } from '../vessels'
import { Heart } from './Heart'
import { vesselPointAt } from './curve'
import { VesselLabels } from './VesselLabels'
import { VesselNode } from './VesselNode'
import { VesselTube } from './VesselTube'

/** Vessel colour before a prediction arrives — neither healthy nor sick. */
const NEUTRAL = '#9aa7b2'

/**
 * Heart orientation: anterior tilt (apex swings toward the viewer) and a
 * lateral roll (apex toward the patient's left), matching how a heart sits
 * in the chest rather than an axis-aligned lathe. Kept deliberately strong —
 * an upright, axis-aligned organ reads as a diagram, not a body part.
 */
const HEART_TILT: [number, number, number] = [-0.26, 0.12, 0.24]

function mapVessels<T>(fn: (vessel: VesselId) => T): Record<VesselId, T> {
  return Object.fromEntries(
    VESSELS.map((vessel) => [vessel, fn(vessel)]),
  ) as Record<VesselId, T>
}

interface NodePlacement {
  key: string
  vessel: VesselId
  position: [number, number, number]
}

interface SceneProps {
  /** Stable host element for the <Html> vessel pills — see App.tsx. */
  labelPortal: RefObject<HTMLDivElement | null>
}

export function Scene({ labelPortal }: SceneProps) {
  const prediction = usePrediction()
  const { selectedVessel, selectVessel } = useVesselSelector()

  const probabilities = useMemo(
    () => mapVessels((vessel) => prediction?.vessels[vessel] ?? null),
    [prediction],
  )

  const colors = useMemo(
    () =>
      mapVessels((vessel) => {
        const p = probabilities[vessel]
        return p === null ? NEUTRAL : riskColor(p)
      }),
    [probabilities],
  )

  const nodes = useMemo<NodePlacement[]>(
    () =>
      VESSELS.flatMap((vessel) =>
        NODE_FRACTIONS.map((fraction) => {
          const point = vesselPointAt(vessel, fraction)
          return {
            key: `${vessel}-${fraction}`,
            vessel,
            position: [point.x, point.y, point.z] as [number, number, number],
          }
        }),
      ),
    [],
  )

  /** Clicking the same vessel again clears it, so 2c is reversible. */
  const handleSelect = useCallback(
    (vessel: VesselId) => {
      selectVessel(selectedVessel === vessel ? null : vessel)
    },
    [selectedVessel, selectVessel],
  )

  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0.1, 0.7, 4.5], fov: 42, near: 0.1, far: 40 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      performance={{ min: 0.5, max: 1 }}
      onPointerMissed={() => selectVessel(null)}
    >
      <color attach="background" args={['#eef3f7']} />

      {/*
        Key + fill + rim, with a deliberately low ambient term: high ambient
        light flattens the shading, which is exactly what made the first
        procedural cut look like a smooth blob instead of a solid organ.
      */}
      <ambientLight intensity={0.45} />
      <directionalLight position={[4.5, 3, 2.5]} intensity={1.35} />
      <directionalLight position={[-4, 1, -3]} intensity={0.5} />
      <directionalLight position={[-2, 3, -5]} intensity={0.65} />

      <group rotation={HEART_TILT}>
        <Heart />

        {VESSELS.map((vessel) => (
          <VesselTube
            key={vessel}
            vessel={vessel}
            color={colors[vessel]}
            selected={selectedVessel === vessel}
            onSelect={handleSelect}
          />
        ))}

        {nodes.map((node) => (
          <VesselNode
            key={node.key}
            vessel={node.vessel}
            position={node.position}
            color={colors[node.vessel]}
            selected={selectedVessel === node.vessel}
            onSelect={handleSelect}
          />
        ))}

        <VesselLabels
          portal={labelPortal}
          probabilities={probabilities}
          colors={colors}
          selectedVessel={selectedVessel}
        />
      </group>

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        minDistance={1.8}
        maxDistance={9}
        minPolarAngle={0.35}
        maxPolarAngle={Math.PI - 0.35}
        target={[0, 0.42, 0]}
      />

      <AdaptiveDpr />
    </Canvas>
  )
}
