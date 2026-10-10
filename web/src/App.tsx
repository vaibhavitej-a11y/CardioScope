import { useEffect, useRef, useState } from 'react'
import './index.css'
import { getPrediction } from './api/client'
import { collectInputs, defaultInputs } from './api/features'
import { DisclaimerBanner, DISCLAIMER_TEXT } from './components/DisclaimerBanner'
import { DisclaimerModal } from './components/DisclaimerModal'
import { ExplainPanel } from './components/ExplainPanel'
import { HeartSoundToggle } from './components/HeartSoundToggle'
import { PatientForm } from './components/PatientForm'
import { RiskStrip } from './components/RiskStrip'
import { usePatientStore } from './store/patientStore'
import type { ViewCommand, ViewName } from './three/Scene'
import { Scene } from './three/Scene'

/**
 * App shell.
 *
 * Layout: 3D canvas in the middle with the clinical readouts beside it
 * (requirement 3a — "alongside the 3D visualization canvas"), the patient
 * input workflow on the left, and the §3b/§3c interpretation panels under
 * the readouts. Disclaimer appears in all three placements required by
 * requirement 5: banner, footer, startup modal.
 */
function App() {
  const setStatus = usePatientStore((s) => s.setStatus)
  const setPrediction = usePatientStore((s) => s.setPrediction)
  const setInputs = usePatientStore((s) => s.setInputs)

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

  /** Latest camera-preset request for the 3D scene (nonce re-fires repeats). */
  const [view, setView] = useState<ViewCommand | null>(null)
  const showView = (name: ViewName) =>
    setView((previous) => ({ name, nonce: (previous?.nonce ?? 0) + 1 }))

  useEffect(() => {
    let cancelled = false
    // Seed the form once so the §3c panel always has measurements to show,
    // then request the first prediction with those values. Reading the store
    // via getState() keeps `inputs` out of the dependency list — otherwise a
    // keystroke would refetch the prediction.
    if (Object.keys(usePatientStore.getState().inputs).length === 0) {
      setInputs(defaultInputs())
    }
    setStatus('loading')
    getPrediction(collectInputs(usePatientStore.getState().inputs))
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
  }, [setStatus, setPrediction, setInputs])

  return (
    <div className="flex h-full flex-col bg-deep text-navy">
      <DisclaimerBanner />

      <main className="flex min-h-0 flex-1 flex-col gap-3 p-3 lg:flex-row">
        <PatientForm className="hidden w-[17rem] shrink-0 lg:flex xl:w-[19rem]" />

        <div className="relative min-h-[340px] flex-1 overflow-hidden rounded-xl border border-mist bg-panel shadow-lg shadow-black/50 ring-1 ring-white/5">
          <div
            ref={labelPortal}
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10"
          />
          <Scene labelPortal={labelPortal} view={view} />

          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
            <div
              role="group"
              aria-label="Camera view"
              className="flex rounded-full border border-mist bg-panel/90 p-1 shadow-md shadow-black/50 backdrop-blur"
            >
              {(['anterior', 'posterior', 'basal', 'apical'] as const).map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => showView(name)}
                  aria-pressed={view?.name === name}
                  className={`rounded-full px-3 py-1 text-[11px] font-medium capitalize transition ${
                    view?.name === name
                      ? 'bg-accent font-semibold text-[#051020]'
                      : 'text-slate hover:text-navy'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
            <HeartSoundToggle />
          </div>
        </div>

        <aside className="w-full shrink-0 space-y-3 overflow-y-auto lg:w-[21rem]">
          <RiskStrip />
          <ExplainPanel />
        </aside>

        <PatientForm className="flex max-h-[60vh] w-full lg:hidden" />
      </main>

      <footer className="border-t border-mist bg-panel px-4 py-2 text-center text-[11px] text-slate">
        {DISCLAIMER_TEXT}
      </footer>

      <DisclaimerModal />
    </div>
  )
}

export default App
