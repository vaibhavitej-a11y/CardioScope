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

import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { ReactNode, RefObject } from 'react'
import { AdaptiveDpr, OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { VesselId } from '../api/types'
import {
  usePatientStore,
  usePrediction,
  useVesselSelector,
} from '../store/patientStore'
import { NODE_FRACTIONS, VESSELS, riskColor } from '../vessels'
import { beatPhase, beatScale } from './heartbeat'
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

/** Camera presets — fixed views the demo can jump to without orbiting. */
export type ViewName = 'anterior' | 'posterior'

/**
 * A view request. `nonce` changes on every click so re-pressing the button
 * you are already looking at still re-centres the camera.
 */
export interface ViewCommand {
  name: ViewName
  nonce: number
}

const VIEW_POSITIONS: Record<ViewName, [number, number, number]> = {
  anterior: [0.1, 0.7, 4.5],
  posterior: [0.1, 0.9, -4.5],
}

interface SceneProps {
  /** Stable host element for the <Html> vessel pills — see App.tsx. */
  labelPortal: RefObject<HTMLDivElement | null>
  /** Latest preset request, or null before the first one. */
  view?: ViewCommand | null
}

export function Scene({ labelPortal, view }: SceneProps) {
  const prediction = usePrediction()
  const { selectedVessel, selectVessel } = useVesselSelector()
  /** Female hearts render ~4% smaller — tied to the form's Sex field. */
  const sex = usePatientStore((s) => s.inputs['Sex'])
  const targetScale = sex === 'Female' ? 0.96 : 1

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

      <OrganGroup targetScale={targetScale}>
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
      </OrganGroup>

      <CameraRig view={view} />

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

/**
 * The organ itself: tilt, heartbeat, and the anatomical sex scale.
 *
 * Every child that must move with the heart — muscle, great vessels,
 * coronaries, nodes, pills — lives inside this one group, so a beat or a
 * body-size change can never pull them apart. The sex scale eases toward its
 * target instead of snapping, so flipping Sex in the form reads as the
 * model reshaping rather than a jump cut.
 */
function OrganGroup({
  targetScale,
  children,
}: {
  targetScale: number
  children: ReactNode
}) {
  const ref = useRef<THREE.Group>(null)
  const smoothed = useRef(targetScale)

  useFrame((_, delta) => {
    const group = ref.current
    if (!group) return
    const ease = 1 - Math.exp(-8 * Math.min(delta, 0.1))
    smoothed.current += (targetScale - smoothed.current) * ease
    group.scale.setScalar(smoothed.current * beatScale(beatPhase()))
  })

  return <group ref={ref} rotation={HEART_TILT}>{children}</group>
}

/**
 * Glides the camera to a preset view when one is requested, then lets go so
 * OrbitControls keeps full control. Uses an exponential approach, so the
 * move is quick at first and settles without overshoot.
 */
function CameraRig({ view }: { view?: ViewCommand | null }) {
  const camera = useThree((state) => state.camera)
  const goal = useRef<THREE.Vector3 | null>(null)

  useEffect(() => {
    if (view) goal.current = new THREE.Vector3(...VIEW_POSITIONS[view.name])
  }, [view])

  useFrame((_, delta) => {
    const target = goal.current
    if (!target) return
    const ease = 1 - Math.exp(-5 * Math.min(delta, 0.1))
    camera.position.lerp(target, ease)
    if (camera.position.distanceTo(target) < 0.015) {
      camera.position.copy(target)
      goal.current = null
    }
  })

  return null
}
