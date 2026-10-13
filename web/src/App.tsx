import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import './index.css'
import { getPrediction, USE_MOCK } from './api/client'
import { collectInputs, defaultInputs } from './api/features'
import { DisclaimerBanner, DISCLAIMER_TEXT } from './components/DisclaimerBanner'
import { DisclaimerModal } from './components/DisclaimerModal'
import { ExplainPanel } from './components/ExplainPanel'
import { HeartSoundToggle } from './components/HeartSoundToggle'
import { Icon } from './components/Icon'
import { PatientForm } from './components/PatientForm'
import { RiskStrip } from './components/RiskStrip'
import { usePatientStore } from './store/patientStore'
import type { ViewCommand, ViewName, ZoomCommand } from './three/Scene'
const Scene = lazy(() => import('./three/Scene').then(module => ({ default: module.Scene })))

function App() {
  const setStatus = usePatientStore(s => s.setStatus)
  const setPrediction = usePatientStore(s => s.setPrediction)
  const setInputs = usePatientStore(s => s.setInputs)
  const status = usePatientStore(s => s.status)
  const prediction = usePatientStore(s => s.prediction)
  const predictionSource = usePatientStore(s => s.predictionSource)
  const selectedVessel = usePatientStore(s => s.selectedVessel)
  // Stable portal: drei labels must not remount when canvas events connect.
  const labelPortal = useRef<HTMLDivElement | null>(null)
  const compass = useRef<SVGSVGElement | null>(null)
  const [view, setView] = useState<ViewCommand>({ name: 'anterior', nonce: 0 })
  const [zoom, setZoom] = useState<ZoomCommand | null>(null)
  const [autoRotate, setAutoRotate] = useState(false)
  const [showLabels, setShowLabels] = useState(true)
  const [riskMap, setRiskMap] = useState(true)
  const [focused, setFocused] = useState(false)
  const showView = (name: ViewName) => {
    setAutoRotate(false)
    setView(previous => ({ name, nonce: previous.nonce + 1 }))
  }

  useEffect(() => {
    let cancelled = false
    if (Object.keys(usePatientStore.getState().inputs).length === 0) setInputs(defaultInputs())
    setStatus('loading')
    getPrediction(collectInputs(usePatientStore.getState().inputs))
      .then(result => { if (!cancelled) setPrediction(result) })
      .catch((error: unknown) => {
        if (!cancelled) setStatus('error', error instanceof Error ? error.message : 'Prediction failed')
      })
    return () => { cancelled = true }
  }, [setStatus, setPrediction, setInputs])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFocused(false)
    }
    const previous = document.body.style.overflow
    if (focused) document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [focused])

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="#" aria-label="CardioScope home">
          <span className="brand-mark"><Icon name="pulse" size={24} /></span>
          <span>cardio<span className="brand-light">scope</span><span className="brand-period">.</span></span>
        </a>
        <div className="header-divider" />
        <span className="workspace-label">Clinical workspace</span>
        <div className="header-right">
          <span className="research-badge"><span /> {predictionSource === 'demo' ? 'Sample mode' : status === 'ready' ? 'Model connected' : status === 'loading' ? 'Connecting to model…' : 'Research edition'}</span>
          <span className="avatar" aria-label="CardioScope workspace">CS</span>
        </div>
      </header>

      <main className="main-content">
        <div className="page-heading">
          <div>
            <div className="breadcrumb">Workspace <Icon name="chevron" size={12} /> Cardiovascular assessment</div>
            <h1>A clearer view of <span>cardiac risk.</span></h1>
            <p>Clinical data. Explainable predictions. One connected picture.</p>
          </div>
          <button className="button button-secondary export-button" type="button" disabled={!prediction || status === 'loading'} onClick={() => window.print()}>
            <Icon name="download" size={16} /> Export assessment
          </button>
        </div>

        <DisclaimerBanner />

        <div className="assessment-grid">
          <PatientForm />

          <section aria-label="Interactive 3D heart viewer" role={focused ? 'dialog' : undefined} aria-modal={focused || undefined} className={`heart-viewer ${focused ? 'is-focused' : ''}`} onKeyDown={event => {
            if (!focused || event.key !== 'Tab') return
            const controls = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
            const first = controls[0]
            const last = controls[controls.length - 1]
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
            if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
          }}>
            <div className="viewer-heading">
              <div className="viewer-title"><span className="viewer-icon"><Icon name="layers" size={17} /></span><div><h2>Cardiac explorer</h2><p>Interactive anatomical model</p></div></div>
              <div className="viewer-modes" role="group" aria-label="Visualization mode">
                <button type="button" aria-pressed={riskMap} onClick={() => setRiskMap(true)}>Risk map</button>
                <button type="button" aria-pressed={!riskMap} onClick={() => setRiskMap(false)}>Anatomy</button>
              </div>
            </div>

            <div className="scene-stage">
              <div className="stage-grid" aria-hidden="true" />
              <div className="stage-orbit orbit-one" aria-hidden="true" />
              <div className="stage-orbit orbit-two" aria-hidden="true" />
              <div className="stage-crosshair" aria-hidden="true" />
              <div className="stage-caption"><span className="live-dot" /> 3D ANATOMICAL VIEW <span className="stage-subcaption">{riskMap ? 'Coronary risk mapping' : 'Anatomy · risk colors off'}</span></div>
              <svg ref={compass} className="anatomical-compass" viewBox="0 0 100 100" aria-label="Anatomical orientation follows the camera">
                <title>L: left; R: right; S: superior; I: inferior; A: anterior; P: posterior. Directions rotate with the camera.</title>
                <circle cx="50" cy="50" r="2" fill="#8c9aaa" />
                {['L', 'R', 'S', 'I', 'A', 'P'].map(axis => <g key={axis} data-axis={axis} opacity="0"><line x1="50" y1="50" x2="50" y2="50" /><g data-head><circle r="8" /><text textAnchor="middle" dominantBaseline="central">{axis}</text></g></g>)}
              </svg>
              <div ref={labelPortal} className="label-portal" />
              <Suspense fallback={<div className="scene-fallback"><Icon name="heart" size={32} /><p>Preparing your 3D workspace…</p></div>}><Scene labelPortal={labelPortal} compass={compass} view={view} zoom={zoom} autoRotate={autoRotate} showLabels={showLabels} riskMap={riskMap} /></Suspense>

              <div className="viewer-tools" role="group" aria-label="3D viewer tools">
                <button type="button" title="Zoom in" aria-label="Zoom in" onClick={() => setZoom(p => ({ direction: 'in', nonce: (p?.nonce ?? 0) + 1 }))}><Icon name="plus" /></button>
                <button type="button" title="Zoom out" aria-label="Zoom out" onClick={() => setZoom(p => ({ direction: 'out', nonce: (p?.nonce ?? 0) + 1 }))}><Icon name="minus" /></button>
                <span />
                <button type="button" title="Reset camera" aria-label="Reset camera" onClick={() => showView('anterior')}><Icon name="reset" size={17} /></button>
                <button type="button" title="Show vessel labels" aria-label="Show vessel labels" aria-pressed={showLabels} onClick={() => setShowLabels(v => !v)}><Icon name="tag" size={16} /></button>
                <button type="button" title={focused ? 'Exit focused view' : 'Expand heart viewer'} aria-label={focused ? 'Exit focused view' : 'Expand heart viewer'} aria-pressed={focused} onClick={() => setFocused(v => !v)}><Icon name={focused ? 'close' : 'expand'} size={16} /></button>
              </div>

              <div className="model-caption"><span className="model-index">01 / HEART · ILLUSTRATIVE MODEL</span><h3>{selectedVessel ? `${selectedVessel} artery` : 'The heart, in perspective.'}</h3><p>{selectedVessel ? 'Selected vessel · explore its contributing factors alongside.' : 'Select a coronary vessel to explore its predicted risk.'}</p></div>
              <div className="viewer-interaction-hint"><span>↔</span> Drag to rotate <i /> Scroll to zoom</div>
            </div>

            <div className="viewer-controls">
              <div className="camera-presets" role="group" aria-label="Camera view">
                {(['anterior', 'posterior', 'basal', 'apical'] as const).map(name => <button key={name} type="button" onClick={() => showView(name)} aria-pressed={view.name === name && !autoRotate}>{name}</button>)}
              </div>
              <button className="rotate-button" type="button" aria-label="Auto-rotate heart" aria-pressed={autoRotate} onClick={() => setAutoRotate(v => !v)}><Icon name="rotate" size={15} /><span>Auto-rotate</span></button>
            </div>
            <div className="viewer-bottom"><div className="risk-legend" aria-label="Risk color legend"><span><i className="legend-low" /> Predicted normal</span><span><i className="legend-mid" /> Uncertain</span><span><i className="legend-high" /> Predicted stenotic</span></div><HeartSoundToggle /></div>
          </section>

          <aside className="results-column" aria-label="Assessment results">
            <RiskStrip />
            <ExplainPanel />
          </aside>
        </div>

        <div className="workspace-footer"><span><Icon name="shield" size={14} /> {USE_MOCK || predictionSource === 'demo' ? 'Illustrative sample data · not a model prediction' : 'Research model · Z-Alizadeh Sani dataset'}</span><span>54 clinical features <i /> 3 coronary vessels <i /> Explainable AI</span></div>
      </main>
      <footer className="app-footer"><span className="footer-brand">cardioscope.</span><span>{DISCLAIMER_TEXT}</span><span>Track A / 2026</span></footer>
      <DisclaimerModal />
    </div>
  )
}

export default App
