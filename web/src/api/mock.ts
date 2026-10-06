/**
 * Canned /api/predict response.
 *
 * Purpose: unblock M3 and M4 from Day 2 so they never wait on M1/M2.
 * Integration later is a config flip (mock -> live), not a rewrite.
 *
 * Numbers below are placeholders shaped like the worked example in the team
 * primer; they are NOT model output.
 */

import type { Prediction } from './types'

export const mockPrediction: Prediction = {
  cad: 0.89,
  vessels: { LAD: 0.94, LCX: 0.31, RCA: 0.62 },
  shap: {
    cad: {
      label: 'High likelihood',
      contributions: [
        { feature: 'ST Elevation', value: 0.22 },
        { feature: 'LDL', value: 0.13 },
        { feature: 'Age', value: 0.07 },
        { feature: 'EF-TTE', value: -0.09 },
      ],
    },
    LAD: {
      label: 'Stenotic',
      contributions: [
        { feature: 'ST Elevation', value: 0.24 },
        { feature: 'Current Smoker', value: 0.11 },
        { feature: 'EF-TTE', value: -0.06 },
      ],
    },
    LCX: {
      label: 'Normal',
      contributions: [
        { feature: 'HDL', value: -0.12 },
        { feature: 'BP', value: 0.05 },
      ],
    },
    RCA: {
      label: 'Borderline',
      contributions: [
        { feature: 'DM', value: 0.09 },
        { feature: 'BMI', value: 0.04 },
      ],
    },
  },
}
