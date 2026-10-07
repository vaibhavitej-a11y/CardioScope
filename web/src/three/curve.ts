/**
 * Cached Catmull-Rom curves for the three coronary arteries.
 *
 * Shared by VesselTube (geometry), VesselNode (marker placement) and
 * VesselLabels (pill anchoring) so all three agree on exactly where a vessel
 * runs — otherwise a marker drifts off its own tube.
 */

import * as THREE from 'three'
import type { VesselId } from '../api/types'
import { VESSEL_POINTS } from '../vessels'

const cache = new Map<VesselId, THREE.CatmullRomCurve3>()

export function getVesselCurve(vessel: VesselId): THREE.CatmullRomCurve3 {
  const hit = cache.get(vessel)
  if (hit) return hit

  const points = VESSEL_POINTS[vessel].map(
    ([x, y, z]) => new THREE.Vector3(x, y, z),
  )
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5)
  cache.set(vessel, curve)
  return curve
}

/**
 * Arc-length position along a vessel — not raw t, so nodes stay evenly
 * spaced regardless of how the control points are distributed.
 */
export function vesselPointAt(vessel: VesselId, fraction: number): THREE.Vector3 {
  return getVesselCurve(vessel).getPointAt(fraction)
}
