/**
 * Procedural heart — requirement 2a ("3D human torso/heart model").
 *
 * Decision D1: procedural is the default and the known-working path; a
 * .glb mesh is a Day-4 gated experiment with a 3 h cutoff, never a
 * dependency. Nothing here needs a downloaded asset, so the app runs
 * offline with no network fetch.
 *
 * Geometry is a LatheGeometry sampled from profileRadius() (in ../vessels),
 * then handed to warpPoint() — the identical function surfacePoint() uses to
 * place the coronary arteries, so the vessels hug the muscle by construction.
 */

import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import {
  AURICLES,
  GREAT_VESSELS,
  profileSamples,
  surfacePoint,
  warpPoint,
} from '../vessels'
import {
  createMuscleMaterial,
  createSulcusMaterial,
  createVesselWallMaterial,
} from './materials'

/** Height of the coronary sulcus dip in warpPoint(); must match it exactly. */
const SULCUS_Y = 0.74

export function Heart() {
  const geometry = useMemo(() => {
    // 96 profile samples / 96 radial steps: the silhouette stays smooth at
    // the apical view (camera 2.2 units away) where 72 showed faceting.
    const profile = profileSamples(96).map(
      ([r, y]) => new THREE.Vector2(r, y),
    )
    const mesh = new THREE.LatheGeometry(profile, 96)
    const position = mesh.attributes.position
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i)
      const y = position.getY(i)
      const z = position.getZ(i)
      const [wx, wy, wz] = warpPoint(Math.hypot(x, z), y, Math.atan2(z, x))
      // Myocardial irregularity. A lathe is perfectly smooth, which reads as
      // machined plastic; reference anatomy models carry a faint granularity.
      // Two octaves — a broad lobulation plus fine grain — applied radially
      // only, so the poles stay put and the coronaries (which follow the
      // analytic surface, lift 1.06) keep their seating.
      const lobes =
        1 +
        0.02 * Math.sin(wx * 6.1 + wy * 4.3) * Math.cos(wz * 5.7 - wy * 3.9)
      const grain =
        0.007 *
        Math.sin(wx * 17.3 + wy * 11.7) *
        Math.cos(wz * 15.9 - wx * 8.2)
      position.setXYZ(i, wx * (lobes + grain), wy, wz * (lobes + grain))
    }
    position.needsUpdate = true
    mesh.computeVertexNormals()
    return mesh
  }, [])

  const muscle = useMemo(() => createMuscleMaterial(), [])
  const sulcusMaterial = useMemo(() => createSulcusMaterial(), [])

  useEffect(
    () => () => {
      geometry.dispose()
      muscle.dispose()
      sulcusMaterial.dispose()
    },
    [geometry, muscle, sulcusMaterial],
  )

  return (
    <group>
      <mesh geometry={geometry} material={muscle} />
      <CoronarySulcus material={sulcusMaterial} />
      <Auricles material={muscle} />
      <GreatVessels />
    </group>
  )
}

/**
 * Atrioventricular groove — the "waist" of the heart, and the channel the
 * RCA and LCX run through. warpPoint() already dips the surface here; this
 * dark band sits half-sunk in that dip so the atria read as a separate mass
 * above the ventricles instead of one continuous dome.
 */
function CoronarySulcus({ material }: { material: THREE.Material }) {
  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = []
    const steps = 96
    for (let i = 0; i < steps; i++) {
      const phi = (i / steps) * Math.PI * 2
      const [x, y, z] = surfacePoint(SULCUS_Y, phi, 1.005)
      points.push(new THREE.Vector3(x, y, z))
    }
    const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.5)
    return new THREE.TubeGeometry(curve, 192, 0.032, 8, true)
  }, [])

  useEffect(() => () => geometry.dispose(), [geometry])

  return <mesh geometry={geometry} material={material} />
}

/**
 * Atrial appendages. Same muscle material as the body, so they read as part
 * of the organ rather than as attachments.
 */
function Auricles({ material }: { material: THREE.Material }) {
  return (
    <group>
      {AURICLES.map((auricle) => (
        <mesh
          key={auricle.name}
          position={auricle.position as [number, number, number]}
          rotation={auricle.rotation as [number, number, number]}
          scale={auricle.scale as [number, number, number]}
          material={material}
        >
          <sphereGeometry args={[1, 28, 20]} />
        </mesh>
      ))}
    </group>
  )
}

function GreatVessels() {
  const geometries = useMemo(
    () =>
      GREAT_VESSELS.map(({ points, radius }) => {
        const curve = new THREE.CatmullRomCurve3(
          points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
          false,
          'catmullrom',
          0.5,
        )
        return new THREE.TubeGeometry(curve, 48, radius, 10, false)
      }),
    [],
  )

  const materials = useMemo(
    () => GREAT_VESSELS.map((vessel) => createVesselWallMaterial(vessel.color)),
    [],
  )

  useEffect(
    () => () => {
      geometries.forEach((g) => g.dispose())
      materials.forEach((m) => m.dispose())
    },
    [geometries, materials],
  )

  return (
    <group>
      {GREAT_VESSELS.map((vessel, i) => (
        <group key={vessel.name}>
          <mesh geometry={geometries[i]} material={materials[i]} />
          {/*
            Rounded stumps. TubeGeometry leaves both ends open, so a vessel
            that is not buried in the muscle shows a hollow mouth — the
            inferior vena cava read as a cut straw until these were added.
          */}
          {[vessel.points[0], vessel.points[vessel.points.length - 1]].map(
            (point, index) => (
              <mesh
                key={`${vessel.name}-${index}`}
                position={point as [number, number, number]}
                material={materials[i]}
              >
                <sphereGeometry args={[vessel.radius, 16, 12]} />
              </mesh>
            ),
          )}
        </group>
      ))}
    </group>
  )
}
