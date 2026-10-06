/**
 * Frozen API contract — replaced on Day 1 (end of day) by M2.
 *
 * This file is the single source of truth for what POST /api/predict returns.
 * M3 (3D) and M4 (dashboard) code against it; M1/M2 produce the real data.
 * After the Day 1 freeze, any change MUST be announced in the team chat.
 */

export type VesselId = 'LAD' | 'LCX' | 'RCA'

export interface Prediction {
  cad: number
  vessels: Record<VesselId, number>
  shap: Record<'cad', ShapBreakdown> & Record<VesselId, ShapBreakdown>
}

export interface ShapBreakdown {
  /** Signed contribution per feature, largest absolute first. */
  contributions: { feature: string; value: number }[]
  /** Model confidence display label, e.g. "High likelihood". */
  label: string
}
