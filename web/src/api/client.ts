/**
 * Fetch wrapper for the prediction API.
 *
 * Vite dev server proxies /api to FastAPI on 127.0.0.1:8001 (see
 * vite.config.ts), so no CORS setup is needed during development. Port 8000
 * is occupied by another local project on the dev machine.
 *
 * Hosted builds may set VITE_API_BASE_URL to the prediction service origin.
 */

import { mockPrediction } from './mock'
import type { Prediction } from './types'

/**
 * true  → canned response from mock.ts (nothing to run server-side)
 * false → POST /api/predict on the FastAPI backend (M2, connected)
 */
export const USE_MOCK = false

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
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '')

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
    response = await fetch(`${API_BASE_URL}/api/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(30_000),
    })
  } catch {
    throw new ApiError('Prediction service unavailable or timed out. Try again or explore a sample assessment.')
  }

  if (!response.ok) {
    throw new ApiError(`prediction failed (${response.status})`, response.status)
  }
  return (await response.json()) as Prediction
}
