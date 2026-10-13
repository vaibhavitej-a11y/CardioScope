import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Patient-space axes: +X left, +Y superior, +Z anterior.
const AXES: Record<string, [number, number, number]> = {
  L: [1, 0, 0], R: [-1, 0, 0], S: [0, 1, 0],
  I: [0, -1, 0], A: [0, 0, 1], P: [0, 0, -1],
}

export function AnatomicalCompass({ overlay }: { overlay: RefObject<SVGSVGElement | null> }) {
  const inverse = useMemo(() => new THREE.Quaternion(), [])
  const direction = useMemo(() => new THREE.Vector3(), [])
  const markers = useRef<{ axis: string; group: SVGGElement; line: SVGLineElement; head: SVGGElement }[]>([])

  useEffect(() => {
    markers.current = Array.from(overlay.current?.querySelectorAll<SVGGElement>('[data-axis]') ?? []).map(group => ({
      axis: group.dataset.axis!, group,
      line: group.querySelector('line')!, head: group.querySelector<SVGGElement>('[data-head]')!,
    }))
  }, [overlay])

  useFrame(({ camera }) => {
    inverse.copy(camera.quaternion).invert()
    for (const marker of markers.current) {
      direction.set(...AXES[marker.axis]).applyQuaternion(inverse)
      const x = 50 + direction.x * 32
      const y = 50 - direction.y * 32
      marker.group.setAttribute('opacity', direction.z < -0.85 ? '0' : String(0.5 + 0.5 * (direction.z + 1) / 2))
      marker.line.setAttribute('x2', x.toFixed(2))
      marker.line.setAttribute('y2', y.toFixed(2))
      marker.head.setAttribute('transform', `translate(${x.toFixed(2)},${y.toFixed(2)})`)
    }
  })
  return null
}
