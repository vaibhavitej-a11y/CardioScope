/**
 * Shared heartbeat clock — one timeline for the visual pulse and the audio.
 *
 * The 3D organ scales on this phase (systolic bump) and the WebAudio
 * thump scheduler in HeartSoundToggle aligns its beats to the same epoch,
 * so what you see and what you hear stay in step without a network asset
 * or a media file — Track A's offline requirement holds either way.
 *
 * Phase 0..1 maps to one cardiac cycle: a sharp "lub" near the start, a
 * softer "dub" a fifth of a second later, then diastole (rest).
 */

/** One cardiac cycle at a resting ~75 bpm. */
export const BEAT_PERIOD_S = 0.8

/** Every beat on the page is measured from this moment. */
export const BEAT_EPOCH_MS = performance.now()

/** Position within the current cycle, 0..1. */
export function beatPhase(nowMs = performance.now()): number {
  const elapsedCycles = (nowMs - BEAT_EPOCH_MS) / 1000 / BEAT_PERIOD_S
  return ((elapsedCycles % 1) + 1) % 1
}

/**
 * Radial scale for a beat phase — two gaussian bumps (lub + dub) on a
 * circular domain, so the curve is continuous across the phase wrap.
 *
 * Amplitude stays near 1.8%: visible as a living pulse, far too small to
 * detach the coronary tubes from the muscle they sit on.
 */
export function beatScale(phase: number): number {
  const lub = bump(phase, 0.05, 0.04)
  const dub = 0.55 * bump(phase, 0.22, 0.06)
  return 1 + 0.018 * (lub + dub)
}

function bump(phase: number, center: number, sigma: number): number {
  const raw = Math.abs(phase - center)
  const distance = Math.min(raw, 1 - raw)
  return Math.exp(-(distance * distance) / (2 * sigma * sigma))
}
