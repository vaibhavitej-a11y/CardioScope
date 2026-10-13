import { usePatientStore, usePrediction, useVesselSelector } from '../store/patientStore'
import { USE_MOCK } from '../api/client'
import { VESSELS, VESSEL_META } from '../vessels'
import { CdbBadge } from './CdbBadge'
import { GaugeCard } from './GaugeCard'
import { Icon } from './Icon'
import { mockPrediction } from '../api/mock'
import { defaultInputs } from '../api/features'

export function RiskStrip() {
  const prediction = usePrediction()
  const status = usePatientStore(s => s.status)
  const error = usePatientStore(s => s.error)
  const inputs = usePatientStore(s => s.inputs)
  const assessedInputs = usePatientStore(s => s.predictionInputs)
  const source = usePatientStore(s => s.predictionSource)
  const setPrediction = usePatientStore(s => s.setPrediction)
  const setInputs = usePatientStore(s => s.setInputs)
  const { selectedVessel, selectVessel } = useVesselSelector()
  const stale = prediction && Object.keys(assessedInputs).some(key => inputs[key] !== assessedInputs[key])

  return <section aria-label="Predicted risk" className="risk-panel panel" aria-busy={status === 'loading'}>
    <header className="panel-heading"><div className="section-title"><Icon name="chart" size={17} /><h2>Risk assessment</h2></div><span className={`result-status ${status === 'loading' ? 'is-loading' : ''}`}>{status === 'loading' ? 'Analyzing' : stale ? 'Inputs changed' : status === 'ready' ? 'Updated' : 'Offline'}</span></header>
    {(USE_MOCK || source === 'demo') && <div className="data-notice demo-notice">Illustrative sample · not a model prediction</div>}
    {stale && <p className="data-notice">Profile changed. Run assessment to update results.</p>}
    <CdbBadge value={prediction?.cad ?? null} />
    <div className="vessel-heading"><span className="eyebrow">CORONARY VESSELS</span><span>Stenosis probability</span></div>
    <div className="vessel-cards">{VESSELS.map(vessel => <GaugeCard key={vessel} title={vessel} subtitle={VESSEL_META[vessel].name} value={prediction?.vessels[vessel] ?? null} active={selectedVessel === vessel} onClick={() => selectVessel(selectedVessel === vessel ? null : vessel)} />)}</div>
    {status === 'error' && <div className="offline-state"><div role="alert" className="connection-error"><Icon name="info" size={15} /><span>Prediction service unavailable. Start the API and run assessment again.<span className="error-detail">{error}</span></span></div><button type="button" className="sample-button" onClick={() => { setInputs(defaultInputs()); setPrediction(mockPrediction, 'demo') }}>Explore a sample assessment <Icon name="arrow" size={12} /></button></div>}
    <p className="risk-footnote"><Icon name="info" size={12} /> {USE_MOCK || source === 'demo' ? 'Illustrative probabilities, not clinical results.' : 'Model predictions, not imaging measurements.'}</p>
  </section>
}
