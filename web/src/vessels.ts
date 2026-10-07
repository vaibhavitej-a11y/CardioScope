/**
 * Anatomical + clinical constants — the single source of truth behind the
 * spec's "consistent correspondence between model outputs and the displayed
 * LAD, LCX, RCA anatomical structures" (Track A, Technical Considerations).
 *
 * Everything the 3D layer, the dashboard and (later) the API say about a
 * vessel comes from here: its id, what region it supplies, its colour at a
 * given probability, and where it sits on the procedural heart.
 *
 * Pure math only — no three.js import, so M4 components can use it without
 * pulling renderer code into their chunk.
 */

import type { VesselId } from './api/types'

export type { VesselId }

export const VESSELS: readonly VesselId[] = ['LAD', 'LCX', 'RCA']

export interface VesselMeta {
  /** Full name as spelled out in the Track A medical primer. */
  readonly name: string
  /** Region it supplies — verbatim from the primer, used in the UI copy. */
  readonly supplies: string
}

export const VESSEL_META: Readonly<Record<VesselId, VesselMeta>> = {
  LAD: {
    name: 'Left Anterior Descending',
    supplies: 'front of the heart',
  },
  LCX: {
    name: 'Left Circumflex',
    supplies: 'side and back of the heart',
  },
  RCA: {
    name: 'Right Coronary Artery',
    supplies: 'right side and bottom of the heart',
  },
}

/* ------------------------------------------------------------------ colour */

/**
 * Clinical palette. MUST stay in step with the `@theme` tokens in
 * `web/src/index.css` (--color-risk-low / -mid / -high); the spec's legend is
 * GREEN = predicted normal, AMBER = uncertain, RED = predicted stenotic.
 *
 * Never repurpose these for generic success/warning/error states.
 */
export const RISK_COLORS = {
  low: '#27ae60',
  mid: '#f39c12',
  high: '#e74c3c',
} as const

export type RiskBand = keyof typeof RISK_COLORS

/**
 * Where a probability sits relative to the two clinical anchors.
 * 0.25 and below reads as "predicted normal", 0.75 and above as
 * "predicted stenotic", between them as uncertain.
 */
export function riskBand(probability: number): RiskBand {
  const p = clamp01(probability)
  if (p <= 0.25) return 'low'
  if (p >= 0.75) return 'high'
  return 'mid'
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function lerpHex(a: string, b: string, t: number): string {
  // Clamped: riskColor() can ask for t outside 0..1 (a probability of 0.05
  // or 0.94 extrapolates past the anchor), which produced out-of-range
  // channels and therefore invalid #rrggbb strings.
  const k = t < 0 ? 0 : t > 1 ? 1 : t
  const ra = hexToRgb(a)
  const rb = hexToRgb(b)
  const mix = ra.map((v, i) => Math.round(v + (rb[i] - v) * k))
  return `#${mix.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

/**
 * Continuous green → amber → red ramp for tube/node materials.
 * Anchored so 0.25 is pure green, 0.5 pure amber, 0.75 pure red.
 */
export function riskColor(probability: number): string {
  const p = clamp01(probability)
  if (p <= 0.5) {
    return lerpHex(RISK_COLORS.low, RISK_COLORS.mid, (p - 0.25) / 0.25)
  }
  return lerpHex(RISK_COLORS.mid, RISK_COLORS.high, (p - 0.5) / 0.25)
}

/**
 * Display label for a band. Wording is locked by the project's language
 * rules: these describe a *prediction*, never a finding.
 */
export function riskLabel(band: RiskBand): string {
  switch (band) {
    case 'low':
      return 'Predicted normal'
    case 'mid':
      return 'Uncertain'
    case 'high':
      return 'Predicted stenotic'
  }
}

/* ------------------------------------------------------------- heart shape */

/**
 * Lathe profile of the procedural heart: [radius, y], ordered from the base
 * (top) down to the apex (bottom). Radius 0 at both ends gives closed poles,
 * so the mesh needs no separate cap.
 *
/**
 * Radius of the heart at a given height.
 *
 * An analytic curve rather than a table of control points: a lathe over
 * piecewise-linear rows puts a visible crease at every row, and with the
 * atrial lobes multiplying the base the crease at the shoulder read as a hard
 * brim. Sampling this function is smooth everywhere by construction.
 *
 * The shape is a spheroid stretched fuller toward the base and drawn out to a
 * point at the apex — widest just above the middle, which is where a heart's
 * ventricular mass actually is.
 *
 * @param y HEART_BOTTOM..HEART_TOP
 */
export function profileRadius(y: number): number {
  const yy = Math.min(1, Math.max(-1, y))
  const width = 1 - yy * yy
  if (width <= 0) return 0
  return 0.8 * Math.sqrt(width) * (1 + 0.35 * yy)
}

/**
 * Even samples of profileRadius, ready to hand to a LatheGeometry.
 *
 * Ordered bottom-to-top on purpose. LatheGeometry derives its triangle
 * winding from the direction the profile is traversed, so walking it from the
 * apex up to the base is what gives the mesh outward-facing normals. Walking
 * it the other way culls the anterior wall outright: the scene then shows the
 * far wall and every artery that should be hidden behind the heart — the
 * posterior RCA, in particular — reads as a stray orange stripe drawn across
 * the front of the muscle.
 */
export function profileSamples(steps = 64): (readonly [number, number])[] {
  const out: (readonly [number, number])[] = []
  for (let i = 0; i <= steps; i++) {
    const y = HEART_BOTTOM + ((HEART_TOP - HEART_BOTTOM) * i) / steps
    out.push([profileRadius(y), y])
  }
  return out
}

/** Base of the heart (top). */
export const HEART_TOP = 1.0
/** Apex of the heart (bottom). */
export const HEART_BOTTOM = -1.0

/**
 * The apex leans anteriorly and toward the patient's left. Heart.tsx warps
 * its lathe by exactly this function, so the vessels must be warped by the
 * identical one or they will float off the surface as the mesh changes.
 */
export function apexOffset(y: number): readonly [number, number] {
  const t = (HEART_TOP - y) / (HEART_TOP - HEART_BOTTOM)
  const s = t * t
  return [0.2 * s, 0.14 * s]
}

/** Front-to-back flattening — cross-sections are ellipses, not circles. */
const DEPTH = 0.86
/** Azimuth of the anterior interventricular groove, where LAD runs. */
const ANTERIOR = Math.PI / 2

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/** Shortest signed angle between `a` and the target, in (-PI, PI]. */
function shortestAngle(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a))
}

/**
 * The one definition of the heart's shape.
 *
 * Heart.tsx feeds it every lathe vertex and surfacePoint() feeds it every
 * coronary control point, so the arteries stay welded to the muscle however
 * the silhouette is sculpted — editing one without the other makes the tubes
 * float off (or sink into) the myocardium.
 *
 * @param r0   radius on the revolved profile, before any lift
 * @param y    height, HEART_BOTTOM..HEART_TOP
 * @param phi  azimuth; 0 = patient's left, PI/2 = anterior, PI = patient's right
 * @param lift 1.0 sits on the mesh; vessels pass >1 so their tube radius does
 *             not half-sink into the myocardium
 */
export function warpPoint(
  r0: number,
  y: number,
  phi: number,
  lift = 1,
): [number, number, number] {
  let r = r0 * lift

  // Paired atrial lobes at the base, at the patient's left and right. A lathe
  // is rotationally symmetric, so this is the only place the crown can be
  // made. cos(2*phi) is allowed to go negative: it pulls the base in at the
  // front and back so the lobes read as two distinct bumps on the silhouette
  // instead of one flared ring — a flared ring is what looked like a cup.
  const atria = 0.42 * smoothstep(0.45, 0.92, y) * Math.cos(2 * phi)
  r *= 1 + atria

  // Atrioventricular (coronary) sulcus — the waist between the atrial crown
  // and the ventricular mass, and the channel RCA and LCX actually run in.
  // Without it the muscle is a single unbroken dome, which is precisely what
  // made every earlier iteration read as a pear rather than a heart.
  const sulcus = 0.06 * Math.exp(-((y - 0.74) * (y - 0.74)) / (2 * 0.14 * 0.14))
  r *= 1 - sulcus

  // Ventricular asymmetry: the left ventricle is the bulk of the muscle and
  // bulges toward the patient's left, while the right side stays flatter.
  // A lathe is symmetric by construction, so conical leaning has to be
  // reintroduced here — it is what turns an egg into a heart.
  const ventricle = 0.1 * smoothstep(0.7, -0.1, y)
  r *= 1 + ventricle * Math.cos(phi)

  // Anterior interventricular groove — a shallow channel the LAD seats into.
  // Opens just below the base and fades out short of the apex.
  const groove =
    0.2 * smoothstep(0.8, 0.55, y) * smoothstep(-0.95, -0.7, y)
  const foreAft = shortestAngle(phi - ANTERIOR)
  r *= 1 - groove * Math.exp(-(foreAft * foreAft) / (2 * 0.34 * 0.34))

  const [ox, oz] = apexOffset(y)
  return [r * Math.cos(phi) * 0.95 + ox, y, r * Math.sin(phi) * DEPTH * 0.95 + oz]
}

/**
 * A point on (or just proud of) the heart surface.
 *
 * @param y     vertical position, HEART_BOTTOM..HEART_TOP
 * @param phi   azimuth in radians; 0 = patient's left, PI/2 = anterior,
 *              PI = patient's right, -PI/2 = posterior
 * @param lift  1.0 sits exactly on the surface; vessels use > 1 so their
 *              tube radius does not half-sink into the myocardium
 */
export function surfacePoint(
  y: number,
  phi: number,
  lift = 1.06,
): [number, number, number] {
  return warpPoint(profileRadius(y), y, phi, lift)
}

/* ---------------------------------------------------------- vessel routes */

/** [y, phiDegrees] samples tracing each coronary artery over the surface. */
const ROUTE_SAMPLES: Readonly<Record<VesselId, readonly (readonly [number, number])[]>> = {
  // Anterior interventricular groove: down the front, drifting patient-left.
  LAD: [
    [0.92, 70],
    [0.7, 74],
    [0.44, 78],
    [0.15, 82],
    [-0.15, 86],
    [-0.45, 90],
    [-0.72, 95],
    [-0.92, 100],
  ],
  // Left atrioventricular groove, around the left margin to the posterior.
  // Stops short of the midline so it never collides with the RCA's descent.
  LCX: [
    [0.9, 48],
    [0.84, 18],
    [0.76, -14],
    [0.64, -46],
    [0.5, -72],
    [0.38, -88],
  ],
  // Right atrioventricular groove, round the right side, then down to the
  // diaphragmatic surface — supplies "right side and bottom".
  RCA: [
    [0.9, 120],
    [0.85, 155],
    [0.78, 190],
    [0.68, 220],
    [0.55, 246],
    [0.4, 260],
    [0.1, 265],
    [-0.25, 267],
    [-0.55, 268],
  ],
}

/** Control points for each vessel's Catmull-Rom curve, in heart-local space. */
export const VESSEL_POINTS: Readonly<Record<VesselId, [number, number, number][]>> =
  Object.fromEntries(
    VESSELS.map((id) => [
      id,
      ROUTE_SAMPLES[id].map(([y, phi]) => surfacePoint(y, (phi * Math.PI) / 180)),
    ]),
  ) as Record<VesselId, [number, number, number][]>

/**
 * Where the clickable §2b "nodes" sit — three evenly spaced along each
 * vessel, expressed as arc-length fractions. Nine markers total, so the
 * literal wording of the requirement is satisfied and §2c selection has an
 * obvious hit target.
 */
export const NODE_FRACTIONS: readonly number[] = [0.16, 0.5, 0.84]

/**
 * Great vessels (aortic arch, pulmonary trunk) — context only, never
 * risk-coloured. Both start inside the heart's base so they read as growing
 * out of it rather than floating above it.
 */
export const GREAT_VESSELS: readonly {
  readonly points: [number, number, number][]
  readonly radius: number
}[] = [
  {
    // Ascending aorta from the base, arching over posteriorly.
    points: [
      [0.03, 0.9, 0.03],
      [0.05, 1.15, 0.01],
      [0.03, 1.38, -0.07],
      [-0.09, 1.53, -0.21],
      [-0.29, 1.55, -0.37],
      [-0.45, 1.44, -0.45],
    ],
    radius: 0.105,
  },
  {
    // Pulmonary trunk, anterior and to the patient's right of the aorta.
    points: [
      [-0.12, 0.88, 0.16],
      [-0.16, 1.1, 0.21],
      [-0.28, 1.27, 0.17],
      [-0.45, 1.3, 0.03],
    ],
    radius: 0.085,
  },
]
