import * as THREE from 'three'

/** Taper the rings around the cached centerline, preserving the surface route. */
export function taperedTube(curve: THREE.CatmullRomCurve3, radius: number, segments = 80, radialSegments = 10) {
  const geometry = new THREE.TubeGeometry(curve, segments, radius, radialSegments, false)
  const positions = geometry.attributes.position
  for (let ring = 0; ring <= segments; ring++) {
    const t = ring / segments
    const center = curve.getPointAt(t)
    const taper = 0.28 + 0.72 * Math.pow(1 - t, 0.65)
    for (let side = 0; side <= radialSegments; side++) {
      const i = ring * (radialSegments + 1) + side
      positions.setXYZ(i,
        center.x + (positions.getX(i) - center.x) * taper,
        center.y + (positions.getY(i) - center.y) * taper,
        center.z + (positions.getZ(i) - center.z) * taper,
      )
    }
  }
  positions.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}
