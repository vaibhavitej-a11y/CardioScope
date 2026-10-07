import { useEffect, useRef } from 'react'
import './index.css'
import { getPrediction } from './api/client'
import { DisclaimerBanner, DISCLAIMER_TEXT } from './components/DisclaimerBanner'
import { DisclaimerModal } from './components/DisclaimerModal'
import { RiskStrip } from './components/RiskStrip'
import { VesselDetailPanel } from './components/VesselDetailPanel'
import { usePatientStore } from './store/patientStore'
import { Scene } from './three/Scene'

/**
 * App shell.
 *
 * Layout: 3D canvas on the left, clinical readouts beside it (requirement 3a
 * — "alongside the 3D visualization canvas"). Disclaimer appears in all
 * three placements required by requirement 5: banner, footer, startup modal.
 */
function App() {
  const setStatus = usePatientStore((s) => s.setStatus)
  const setPrediction = usePatientStore((s) => s.setPrediction)

  /**
   * Fixed host for the drei <Html> vessel pills.
   *
   * Left to itself, Html targets `events.connected || canvas.parentNode`, and
   * `events.connected` changes identity once R3F wires up pointer events.
   * That re-runs Html's mount effect, whose cleanup calls
   * `createRoot(...).unmount()` on the pill's *own* React root while the scene
   * root is still rendering — React logs "Attempted to synchronously unmount a
   * root while React was already rendering" and the victim pill is left as an
   * empty div (observed: LAD's pill silently disappearing). Pinning the target
   * to this sibling of <Canvas> keeps the identity stable, so the effect runs
   * exactly once.
   */
  const labelPortal = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    getPrediction({})
      .then((prediction) => {
        if (!cancelled) setPrediction(prediction)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setStatus(
            'error',
            error instanceof Error ? error.message : 'prediction failed',
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [setStatus, setPrediction])

  return (
    <div className="flex h-full flex-col bg-mist text-navy">
      <DisclaimerBanner />

      <main className="flex min-h-0 flex-1 flex-col gap-3 p-3 lg:flex-row">
        <div className="relative min-h-[340px] flex-1 overflow-hidden rounded-xl border border-mist bg-white">
          <div
            ref={labelPortal}
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10"
          />
          <Scene labelPortal={labelPortal} />
        </div>

        <aside className="w-full shrink-0 space-y-3 lg:w-[21rem]">
          <RiskStrip />
          <VesselDetailPanel />
        </aside>
      </main>

      <footer className="border-t border-mist bg-white px-4 py-2 text-center text-[11px] text-slate">
        {DISCLAIMER_TEXT}
      </footer>

      <DisclaimerModal />
    </div>
  )
}

export default App
