/**
 * Vessel name + probability pills anchored to the 3D model.
 *
 * Uses drei's <Html> rather than <Text>: labels are real DOM, so there is no
 * font file to download and no GPU glyph rasterisation — which keeps the
 * Track A requirement of "responsive 3D ... without requiring dedicated
 * GPUs" intact. `pointer-events: none` keeps the pills out of the way of
 * tube/node picking.
 */

import { Html } from '@react-three/drei'
import type { RefObject } from 'react'
import type { VesselId } from '../api/types'
import { VESSELS, VESSEL_META } from '../vessels'
import { vesselPointAt } from './curve'

interface VesselLabelsProps {
  /**
   * Stable mount point for the pills. Without it drei falls back to a target
   * whose identity changes during startup, which unmounts each pill's private
   * React root mid-render and can leave one of them empty (see App.tsx).
   */
  portal: RefObject<HTMLDivElement | null>
  /** null while no prediction has arrived — pill shows an em dash. */
  probabilities: Record<VesselId, number | null>
  colors: Record<VesselId, string>
  selectedVessel: VesselId | null
}

/** Anchor at mid-arc, lifted clear of the tube it labels. */
const ANCHOR = 0.5
const LIFT: [number, number, number] = [0, 0.1, 0]

export function VesselLabels({
  portal,
  probabilities,
  colors,
  selectedVessel,
}: VesselLabelsProps) {
  return (
    <group>
      {VESSELS.map((vessel) => {
        const anchor = vesselPointAt(vessel, ANCHOR)
        const probability = probabilities[vessel]
        const selected = selectedVessel === vessel
        const label =
          probability === null ? '—' : `${Math.round(probability * 100)}%`

        return (
          <Html
            key={vessel}
            // drei still types this as RefObject<HTMLElement>; React 19 refs
            // are RefObject<T | null>. The runtime only ever reads `.current`.
            portal={portal as unknown as RefObject<HTMLElement>}
            position={[
              anchor.x + LIFT[0],
              anchor.y + LIFT[1],
              anchor.z + LIFT[2],
            ]}
            center
            className="pointer-events-none select-none"
            pointerEvents="none"
            zIndexRange={[20, 0]}
          >
            <div
              className={[
                'flex items-center gap-1.5 rounded-full border bg-white/95 px-2 py-0.5 text-[10px] leading-none shadow-sm transition-opacity',
                selected
                  ? 'border-navy opacity-100 ring-1 ring-navy/25'
                  : 'border-mist opacity-75',
              ].join(' ')}
              title={VESSEL_META[vessel].name}
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: colors[vessel] }}
              />
              <span className="font-semibold text-navy">{vessel}</span>
              <span className="tabular-nums text-slate">{label}</span>
            </div>
          </Html>
        )
      })}
    </group>
  )
}
