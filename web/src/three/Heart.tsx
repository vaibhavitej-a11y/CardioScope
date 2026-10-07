/**
 * Procedural heart — requirement 2a ("3D human torso/heart model").
 *
 * Decision D1: procedural is the default and the known-working path; a
 * .glb mesh is a Day-4 gated experiment with a 3 h cutoff, never a
 * dependency. Nothing here needs a downloaded asset, so the app runs
 * offline with no network fetch.
 *
 * Geometry is a LatheGeometry over HEART_PROFILE (from ../vessels), then
 * warped by apexOffset() — the identical warp surfacePoint() uses to place
 * the coronary arteries, so the vessels hug the muscle by construction.
 */

import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { GREAT_VESSELS, HEART_PROFILE, apexOffset } from '../vessels'

/** Myocardium. Deliberately NOT a risk colour — green/amber/red are reserved. */
const MUSCLE = '#a16259'
/** Great vessels (aorta, pulmonary trunk) — context only, never risk-coloured. */
const GREAT_VESSEL_COLOR = '#8fa3b5'

export function Heart() {
  const geometry = useMemo(() => {
    const profile = HEART_PROFILE.map(([r, y]) => new THREE.Vector2(r, y))
    const mesh = new THREE.LatheGeometry(profile, 56)
    const position = mesh.attributes.position
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i)
      const y = position.getY(i)
      const z = position.getZ(i)
      const [ox, oz] = apexOffset(y)
      position.setXYZ(i, x * 0.95 + ox, y, z * 0.95 + oz)
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
          roughness={0.78}
          metalness={0.02}
        />
      </mesh>
      <GreatVessels />
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
      {geometries.map((geometry, i) => (
        <mesh key={i} geometry={geometry}>
          <meshStandardMaterial
            color={GREAT_VESSEL_COLOR}
            roughness={0.6}
            metalness={0.05}
          />
        </mesh>
      ))}
    </group>
  )
}
