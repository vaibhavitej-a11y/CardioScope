/**
 * Fetch wrapper for the prediction API.
 *
 * Vite dev server proxies /api to FastAPI on 127.0.0.1:8000 (see
 * vite.config.ts), so no CORS setup is needed during development.
 *
 * Contract-first workflow: USE_MOCK is the one switch. The 3D layer and the
 * dashboard are written and reviewed against mock.ts, and turning M2's API
 * on later is a one-line flip rather than a rewrite.
 */

import { mockPrediction } from './mock'
import type { Prediction } from './types'

/**
 * true  → canned response from mock.ts (nothing to run server-side)
 * false → POST /api/predict on the FastAPI backend
 *
 * Flip to false once M2 has deployed the endpoint. Until then the demo must
 * not present mock numbers as real model output.
 */
export const USE_MOCK = true

/** What POST /api/predict accepts — the 54 model inputs. */
export type PredictionInput = Record<string, number | string | boolean>

export class ApiError extends Error {
  readonly status: number | undefined

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const MOCK_LATENCY_MS = 220

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function getPrediction(
  input: PredictionInput,
): Promise<Prediction> {
  if (USE_MOCK) {
    await delay(MOCK_LATENCY_MS)
    return mockPrediction
  }

  let response: Response
  try {
    response = await fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  } catch {
    throw new ApiError('prediction service unreachable')
  }

  if (!response.ok) {
    throw new ApiError(`prediction failed (${response.status})`, response.status)
  }
  return (await response.json()) as Prediction
}
