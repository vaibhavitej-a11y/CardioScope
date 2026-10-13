/** Asset-free studio lighting, anatomical geometry, and linked vessel selection. */
import { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { AdaptiveDpr, Environment, Lightformer, OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { VesselId } from '../api/types'
import { usePrediction, useVesselSelector } from '../store/patientStore'
import { NODE_FRACTIONS, VESSELS, riskColor } from '../vessels'
import { beatPhase, beatScale } from './heartbeat'
import { CardiacVeins } from './CardiacVeins'
import { Heart } from './Heart'
import { vesselPointAt } from './curve'
import { VesselLabels } from './VesselLabels'
import { VesselNode } from './VesselNode'
import { VesselTube } from './VesselTube'
import { AnatomicalCompass } from './AnatomicalCompass'

const NEUTRAL = '#c3baa0'
const HEART_TILT: [number, number, number] = [-0.12, -0.14, 0.2]
const CAMERA_TARGET = new THREE.Vector3(0, 0.38, 0)

export type ViewName = 'anterior' | 'posterior' | 'basal' | 'apical'
export interface ViewCommand { name: ViewName; nonce: number }
export interface ZoomCommand { direction: 'in' | 'out'; nonce: number }

const VIEW_POSITIONS: Record<ViewName, [number, number, number]> = {
  anterior: [0.15, 0.65, 5.5],
  posterior: [0.15, 0.65, -5.5],
  basal: [0.1, 5.7, 0.9],
  apical: [0.1, -4.9, 1.2],
}

interface SceneProps {
  labelPortal: RefObject<HTMLDivElement | null>
  compass: RefObject<SVGSVGElement | null>
  view?: ViewCommand | null
  zoom?: ZoomCommand | null
  autoRotate?: boolean
  showLabels?: boolean
  riskMap?: boolean
}

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed ? <div className="scene-fallback"><strong>3D view is unavailable</strong><p>Enable hardware acceleration or try another browser. Patient inputs and risk results remain available.</p></div> : this.props.children
  }
}

export function Scene({ labelPortal, compass, view, zoom, autoRotate = false, showLabels = true, riskMap = true }: SceneProps) {
  const prediction = usePrediction()
  const { selectedVessel, selectVessel } = useVesselSelector()
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const element = labelPortal.current?.parentElement
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '60px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [labelPortal])
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const probabilities = useMemo(() => Object.fromEntries(VESSELS.map(vessel => [vessel, prediction?.vessels[vessel] ?? null])) as Record<VesselId, number | null>, [prediction])
  const colors = useMemo(() => Object.fromEntries(VESSELS.map(vessel => {
    const p = probabilities[vessel]
    return [vessel, !riskMap || p === null ? NEUTRAL : riskColor(p)]
  })) as Record<VesselId, string>, [probabilities, riskMap])
  const nodes = useMemo(() => VESSELS.flatMap(vessel => NODE_FRACTIONS.map(fraction => ({
    key: `${vessel}-${fraction}`, vessel,
    position: vesselPointAt(vessel, fraction).toArray() as [number, number, number],
  }))), [])
  const handleSelect = useCallback((vessel: VesselId) => selectVessel(selectedVessel === vessel ? null : vessel), [selectedVessel, selectVessel])

  return <SceneBoundary><Canvas
    frameloop={visible && !reducedMotion ? 'always' : 'demand'}
    dpr={[1, 1.5]}
    camera={{ position: VIEW_POSITIONS.anterior, fov: 40, near: 0.1, far: 30 }}
    gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
    performance={{ min: 0.5 }}
    onPointerMissed={() => selectVessel(null)}
    fallback={<div className="scene-fallback">WebGL is unavailable. Try a browser with hardware acceleration enabled.</div>}
  >
    {/* Locally generated light cards: no HDR download or full-screen postprocessing. */}
    <Environment resolution={64} frames={1}>
      <Lightformer form="rect" intensity={2.4} position={[-3, 4, 4]} rotation-y={Math.PI / 5} scale={[4, 5, 1]} color="#fff0de" />
      <Lightformer form="rect" intensity={1.3} position={[4, 0, 2]} rotation-y={-Math.PI / 3} scale={[3, 5, 1]} color="#d5e6df" />
      <Lightformer form="rect" intensity={2} position={[0, 3, -4]} scale={[5, 4, 1]} color="#f4ba94" />
    </Environment>
    <ambientLight intensity={0.35} />
    <hemisphereLight color="#f7e7d6" groundColor="#30423b" intensity={0.8} />
    <directionalLight position={[-3, 4, 5]} intensity={1.7} color="#ffead9" />
    <directionalLight position={[4, 0, 3]} intensity={0.75} color="#cbded5" />
    <directionalLight position={[0, 2, -4]} intensity={2} color="#efb798" />

    <OrganGroup reducedMotion={reducedMotion}>
      <Heart />
      <CardiacVeins animate={!reducedMotion} />
      {VESSELS.map(vessel => <VesselTube key={vessel} vessel={vessel} color={colors[vessel]} selected={selectedVessel === vessel} onSelect={handleSelect} animate={!reducedMotion} />)}
      {nodes.map(node => <VesselNode key={node.key} vessel={node.vessel} position={node.position} color={colors[node.vessel]} selected={selectedVessel === node.vessel} onSelect={handleSelect} />)}
      {showLabels && <VesselLabels portal={labelPortal} probabilities={probabilities} colors={colors} selectedVessel={selectedVessel} onSelect={handleSelect} riskMap={riskMap} />}
    </OrganGroup>

    <CameraRig view={view} zoom={zoom} reducedMotion={reducedMotion} />
    <AnatomicalCompass overlay={compass} />
    <OrbitControls makeDefault enableDamping dampingFactor={0.08} enablePan={false} minDistance={2.8} maxDistance={8} minPolarAngle={0.12} maxPolarAngle={Math.PI - 0.12} target={CAMERA_TARGET} autoRotate={autoRotate && !reducedMotion} autoRotateSpeed={0.6} />
    <AdaptiveDpr />
  </Canvas></SceneBoundary>
}

function OrganGroup({ children, reducedMotion }: { children: ReactNode; reducedMotion: boolean }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    const group = ref.current
    if (!group) return
    const k = reducedMotion ? 0 : beatScale(beatPhase()) - 1
    group.scale.set(1 - k * 1.1, 1 + k * 0.35, 1 - k)
    group.rotation.set(HEART_TILT[0] + k * 0.3, HEART_TILT[1], HEART_TILT[2] + k * 0.45)
  })
  return <group ref={ref} rotation={HEART_TILT} position={[0, 0.12, 0]}>{children}</group>
}

function CameraRig({ view, zoom, reducedMotion }: { view?: ViewCommand | null; zoom?: ZoomCommand | null; reducedMotion: boolean }) {
  const camera = useThree(state => state.camera)
  const size = useThree(state => state.size)
  const gl = useThree(state => state.gl)
  const goal = useRef<THREE.Vector3 | null>(null)
  const aspect = size.width / size.height

  useEffect(() => {
    if (!view) return
    const target = new THREE.Vector3(...VIEW_POSITIONS[view.name])
    // Keep the complete silhouette visible in narrow mobile viewports.
    if (aspect < 0.82) target.sub(CAMERA_TARGET).multiplyScalar(1.12).add(CAMERA_TARGET)
    goal.current = target
  }, [view, aspect])

  useEffect(() => {
    if (!zoom) return
    const offset = (goal.current ?? camera.position).clone().sub(CAMERA_TARGET)
    const distance = THREE.MathUtils.clamp(offset.length() * (zoom.direction === 'in' ? 0.82 : 1.22), 2.8, 8)
    goal.current = offset.setLength(distance).add(CAMERA_TARGET)
  }, [zoom, camera])

  useEffect(() => {
    const cancel = () => { goal.current = null }
    gl.domElement.addEventListener('pointerdown', cancel)
    gl.domElement.addEventListener('wheel', cancel, { passive: true })
    return () => {
      gl.domElement.removeEventListener('pointerdown', cancel)
      gl.domElement.removeEventListener('wheel', cancel)
    }
  }, [gl])

  useFrame((_, delta) => {
    const target = goal.current
    if (!target) return
    camera.position.lerp(target, reducedMotion ? 1 : 1 - Math.exp(-6 * Math.min(delta, 0.1)))
    if (camera.position.distanceTo(target) < 0.01) { camera.position.copy(target); goal.current = null }
  })
  return null
}
