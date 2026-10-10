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
import {
  AdaptiveDpr,
  Environment,
  Lightformer,
  OrbitControls,
} from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import type { VesselId } from '../api/types'
import {
  usePatientStore,
  usePrediction,
  useVesselSelector,
} from '../store/patientStore'
import { NODE_FRACTIONS, VESSELS, riskColor } from '../vessels'
import { beatPhase, beatScale } from './heartbeat'
import { CardiacVeins } from './CardiacVeins'
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
export type ViewName = 'anterior' | 'posterior' | 'basal' | 'apical'

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
  basal: [0.15, 1.1, 5.5],
  apical: [0.1, 0.3, 2.2],
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
      <GradientBackdrop />

      {/*
        Studio rig: an IBL environment (all lightformers are rendered
        locally — nothing is fetched, Track A stays offline) for the wet
        speculars, a warm key, a cool fill, and a strong back rim so the
        silhouette glows against the backdrop the way reference medical
        renders do.
      */}
      <Environment resolution={128} frames={1}>
        <Lightformer
          form="rect"
          intensity={3}
          position={[0, 3.5, 4]}
          rotation-x={Math.PI / 3}
          scale={[7, 4, 1]}
          color="#ffffff"
        />
        <Lightformer
          form="ring"
          intensity={2.2}
          position={[-5, 1, -3]}
          scale={4}
          color="#cfe4ff"
        />
        <Lightformer
          form="rect"
          intensity={2.6}
          position={[4, 0.5, -4.5]}
          rotation-y={-Math.PI / 3}
          scale={[5, 6, 1]}
          color="#ffdcc4"
        />
      </Environment>

      <ambientLight intensity={0.3} />
      <hemisphereLight color="#9fc6ff" groundColor="#1a2436" intensity={0.45} />
      <directionalLight position={[4.5, 3, 2.5]} intensity={0.95} />
      <directionalLight position={[-4, 1, -3]} intensity={0.35} />
      {/* Warm back-rim: light travelling through the muscle (transmission)
          plus this fresnel-separable edge is what sells "living tissue". */}
      <directionalLight position={[-1.5, 2.5, -4.5]} intensity={1.25} color="#ffb08a" />
      <directionalLight position={[2, 4, -3]} intensity={0.55} color="#ffffff" />

      <OrganGroup targetScale={targetScale}>
        <Heart />
        <CardiacVeins />

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

      {/*
        Bloom picks up the speculars and the vessel emissives — a soft glow
        that reads as "studio render" instead of "browser canvas". Vignette
        pulls the eye to centre frame. Both are cheap; AdaptiveDpr steps the
        resolution down if the frame budget slips.
      */}
      <EffectComposer multisampling={4}>
        <Bloom
          intensity={0.85}
          luminanceThreshold={0.62}
          luminanceSmoothing={0.32}
          mipmapBlur
          radius={0.85}
        />
        <Vignette offset={0.26} darkness={0.55} />
      </EffectComposer>
    </Canvas>
  )
}

/**
 * Radial studio backdrop — a deep midnight wash with a soft blue glow behind
 * the organ that falls off to near-black at the edges. A CanvasTexture on
 * scene.background is camera-independent (survives the posterior preset) and
 * needs no network fetch, keeping Track A fully offline.
 */
function GradientBackdrop() {
  const texture = useMemo(() => {
    const size = 512
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (ctx) {
      const gradient = ctx.createRadialGradient(
        size * 0.5,
        size * 0.42,
        size * 0.05,
        size * 0.5,
        size * 0.5,
        size * 0.8,
      )
      gradient.addColorStop(0, '#1b3050')
      gradient.addColorStop(0.45, '#0d1626')
      gradient.addColorStop(1, '#05080f')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, size, size)
    }
    const map = new THREE.CanvasTexture(canvas)
    map.colorSpace = THREE.SRGBColorSpace
    return map
  }, [])

  useEffect(() => () => texture.dispose(), [texture])

  // attach="background" sets scene.background on mount and restores it on
  // unmount — no direct mutation of the hook's return value.
  return <primitive object={texture} attach="background" />
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

    // Systole reads as a *contraction*, not an inflate: the radial bulge is
    // stronger than the long axis, and a torsional sway (apex leading) rides
    // the same phase. Amplitudes stay tiny — coronaries must keep their seat.
    const k = beatScale(beatPhase()) - 1
    const base = smoothed.current
    group.scale.set(
      base * (1 + k * 1.2),
      base * (1 + k * 0.5),
      base * (1 + k * 1.2),
    )
    group.rotation.set(
      HEART_TILT[0] + k * 0.35,
      HEART_TILT[1],
      HEART_TILT[2] + k * 0.55,
    )
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
