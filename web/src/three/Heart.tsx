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
import { AURICLES, GREAT_VESSELS, profileSamples, warpPoint } from '../vessels'

/** Myocardium. Deliberately NOT a risk colour — green/amber/red are reserved. */
const MUSCLE = '#a16259'

export function Heart() {
  const geometry = useMemo(() => {
    const profile = profileSamples(72).map(
      ([r, y]) => new THREE.Vector2(r, y),
    )
    const mesh = new THREE.LatheGeometry(profile, 72)
    const position = mesh.attributes.position
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i)
      const y = position.getY(i)
      const z = position.getZ(i)
      const [wx, wy, wz] = warpPoint(Math.hypot(x, z), y, Math.atan2(z, x))
      // Myocardial irregularity. A lathe is perfectly smooth, which reads as
      // machined plastic; reference anatomy models carry a faint granularity.
      // Applied radially only, so the poles stay put — and small enough that
      // the coronaries (which follow the analytic surface, lift 1.06) keep
      // their seating.
      const lump =
        1 + 0.018 * Math.sin(wx * 6.1 + wy * 4.3) * Math.cos(wz * 5.7 - wy * 3.9)
      position.setXYZ(i, wx * lump, wy, wz * lump)
    }
    position.needsUpdate = true
    mesh.computeVertexNormals()
    return mesh
  }, [])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color={MUSCLE}
          roughness={0.62}
          metalness={0.04}
        />
      </mesh>
      <Auricles />
      <GreatVessels />
    </group>
  )
}

/**
 * Atrial appendages. Same muscle material as the body, so they read as part
 * of the organ rather than as attachments.
 */
function Auricles() {
  return (
    <group>
      {AURICLES.map((auricle) => (
        <mesh
          key={auricle.name}
          position={auricle.position as [number, number, number]}
          rotation={auricle.rotation as [number, number, number]}
          scale={auricle.scale as [number, number, number]}
        >
          <sphereGeometry args={[1, 28, 20]} />
          <meshStandardMaterial
            color={MUSCLE}
            roughness={0.66}
            metalness={0.04}
          />
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

  useEffect(() => () => geometries.forEach((g) => g.dispose()), [geometries])

  return (
    <group>
      {GREAT_VESSELS.map((vessel, i) => (
        <group key={vessel.name}>
          <mesh geometry={geometries[i]}>
            <meshStandardMaterial
              color={vessel.color}
              roughness={0.6}
              metalness={0.05}
            />
          </mesh>
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
              >
                <sphereGeometry args={[vessel.radius, 16, 12]} />
                <meshStandardMaterial
                  color={vessel.color}
                  roughness={0.6}
                  metalness={0.05}
                />
              </mesh>
            ),
          )}
        </group>
      ))}
    </group>
  )
}
