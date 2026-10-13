import { usePatientStore, usePrediction, useShapScope, useVesselSelector } from '../store/patientStore'
import { findFeature, formatFeatureValue } from '../api/features'
import { VESSEL_META } from '../vessels'
import { Icon } from './Icon'

const MAX_ROWS = 5

export function ExplainPanel() {
  const prediction = usePrediction()
  const scope = useShapScope()
  const inputs = usePatientStore(s => s.predictionInputs)
  const { selectVessel } = useVesselSelector()
  const breakdown = prediction?.shap[scope]
  const rows = (breakdown?.contributions ?? []).slice(0, MAX_ROWS)
  const total = breakdown?.contributions.length ?? 0
  const maxAbs = rows.reduce((max, entry) => Math.max(max, Math.abs(entry.value)), 0) || 1
  const sum = rows.reduce((acc, entry) => acc + entry.value, 0)
  const vessel = scope === 'cad' ? null : scope

  return <section aria-label="Prediction explanation" className="explain-panel panel">
    <header className="panel-heading"><div className="section-title"><Icon name="spark" size={16} /><h2>{vessel ? `${vessel} risk drivers` : 'Behind the prediction'}</h2></div>{vessel ? <button type="button" onClick={() => selectVessel(null)} className="clear-vessel" aria-label="Clear selected vessel"><Icon name="close" size={14} /></button> : <span className="shap-badge">SHAP</span>}</header>
    <div className="explain-body">
      <p className="explanation-subtitle">{vessel ? `${VESSEL_META[vessel].name} · supplies the ${VESSEL_META[vessel].supplies}.` : 'The factors shaping this assessment.'}</p>
      <div className="contribution-legend"><span><i /> Lowers risk</span><span><i /> Raises risk</span></div>
      {rows.length === 0 ? <div className="explain-empty"><Icon name="chart" size={28} /><p>Your clinical data tells a story.</p><span>Run an assessment to see the factors contributing to predicted risk.</span></div> : <>
        <ul className="contribution-list">{rows.map(entry => {
          const feature = findFeature(entry.feature)
          const raw = inputs[entry.feature] ?? inputs[feature?.name ?? '']
          const measured = raw === undefined ? '—' : formatFeatureValue(entry.feature, raw)
          const positive = entry.value >= 0
          const magnitude = Math.abs(entry.value) / maxAbs * 48
          return <li key={entry.feature}>
            <div className="contribution-name"><span>{feature?.label ?? entry.feature}</span><span>{measured}</span></div>
            <div className="contribution-chart"><div className="contribution-track"><i /><span style={{ background: positive ? '#de9b86' : '#9bbfa6', left: positive ? '50%' : `${50 - magnitude}%`, width: `${magnitude}%` }} /></div><span className={positive ? 'contribution-positive' : 'contribution-negative'}>{positive ? '+' : ''}{entry.value.toFixed(3)}</span></div>
          </li>
        })}</ul>
        <div className="contribution-sum"><span>Sum of shown contributions</span><strong>{sum >= 0 ? '+' : ''}{sum.toFixed(3)}</strong></div>
        <p className="explanation-note">Top {rows.length} of {total} features, in probability units. + raises predicted risk; − lowers it. Model attribution, not causation. Baseline excluded from the sum.</p>
      </>}
    </div>
  </section>
}
