/**
 * Zustand store — patient inputs, predictions, selection.
 *
 * Shared by M4 (form, dashboard) and M3 (the 3D scene reads predictions and
 * the selected vessel). One store, three consumers, so the canvas and the
 * panel can never disagree about what is currently selected.
 *
 * Consume through the narrow hook re-exports at the bottom: passing a whole
 * store slice straight into a component re-renders the Canvas on every change.
 */

import { useMemo } from 'react'
import { create } from 'zustand'
import type { Prediction, VesselId } from '../api/types'

export type FeatureValue = number | string | boolean

export type RequestStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface PatientState {
  /** Raw feature values keyed by dataset column name. */
  inputs: Record<string, FeatureValue>
  /** Latest prediction, or null before the first successful call. */
  prediction: Prediction | null
  status: RequestStatus
  error: string | null
  /** Vessel currently inspected in the 3D scene / detail panel. */
  selectedVessel: VesselId | null
  /** Req 5: the startup disclaimer must be dismissed before interacting. */
  disclaimerDismissed: boolean

  setInputs: (patch: Partial<Record<string, FeatureValue>>) => void
  setPrediction: (prediction: Prediction | null) => void
  setStatus: (status: RequestStatus, error?: string | null) => void
  selectVessel: (vessel: VesselId | null) => void
  dismissDisclaimer: () => void
  reset: () => void
}

export const usePatientStore = create<PatientState>()((set) => ({
  inputs: {},
  prediction: null,
  status: 'idle',
  error: null,
  selectedVessel: null,
  disclaimerDismissed: false,

  setInputs: (patch) =>
    set((state) => {
      const inputs: Record<string, FeatureValue> = { ...state.inputs }
      for (const key of Object.keys(patch)) {
        const value = patch[key]
        // A Partial<...> spread would widen every value to T | undefined,
        // which is not assignable to Record<string, FeatureValue>.
        if (value !== undefined) inputs[key] = value
      }
      return { inputs }
    }),

  setPrediction: (prediction) =>
    set({ prediction, status: prediction ? 'ready' : 'idle', error: null }),

  setStatus: (status, error = null) => set({ status, error }),

  selectVessel: (selectedVessel) => set({ selectedVessel }),

  dismissDisclaimer: () => set({ disclaimerDismissed: true }),

  reset: () =>
    set({
      inputs: {},
      prediction: null,
      status: 'idle',
      error: null,
      selectedVessel: null,
    }),
}))

/* -------------------------------------------------------- narrow selectors */

export function usePrediction(): Prediction | null {
  return usePatientStore((s) => s.prediction)
}

export function useSelectedVessel(): VesselId | null {
  return usePatientStore((s) => s.selectedVessel)
}

/**
 * Two subscriptions folded into one stable object. The memo matters: a
 * selector returning a fresh object every call defeats zustand v5's Object.is
 * check and re-renders (or loops) the Canvas on every notification.
 */
export function useVesselSelector(): {
  selectedVessel: VesselId | null
  selectVessel: (vessel: VesselId | null) => void
} {
  const selectedVessel = usePatientStore((s) => s.selectedVessel)
  const selectVessel = usePatientStore((s) => s.selectVessel)
  return useMemo(
    () => ({ selectedVessel, selectVessel }),
    [selectedVessel, selectVessel],
  )
}
