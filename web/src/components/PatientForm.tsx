import { useState } from 'react'
import { FEATURES, FEATURE_GROUPS, collectInputs, defaultInputs } from '../api/features'
import type { FeatureDef, InputValue } from '../api/features'
import { getPrediction } from '../api/client'
import { usePatientStore } from '../store/patientStore'
import { Icon } from './Icon'

export function PatientForm() {
  const inputs = usePatientStore(s => s.inputs)
  const status = usePatientStore(s => s.status)
  const setInputs = usePatientStore(s => s.setInputs)
  const setStatus = usePatientStore(s => s.setStatus)
  const setPrediction = usePatientStore(s => s.setPrediction)
  const [validationError, setValidationError] = useState<string | null>(null)
  const busy = status === 'loading'

  const run = () => {
    for (const feature of FEATURES) {
      const raw = inputs[feature.name] ?? feature.default
      if (feature.kind === 'number' && (raw === '' || !Number.isFinite(Number(raw)) || Number(raw) < feature.min || Number(raw) > feature.max)) {
        setValidationError(`${feature.label}: enter a value from ${feature.min} to ${feature.max}.`)
        const field = document.getElementById(`f-${feature.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`)
        field?.closest('details')?.setAttribute('open', '')
        field?.focus()
        return
      }
      if (feature.kind === 'number') {
        const steps = (Number(raw) - feature.min) / feature.step
        if (Math.abs(steps - Math.round(steps)) > 0.00001) {
          setValidationError(`${feature.label}: use increments of ${feature.step}.`)
          const field = document.getElementById(`f-${feature.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`)
          field?.closest('details')?.setAttribute('open', '')
          field?.focus()
          return
        }
      }
    }
    setValidationError(null)
    setStatus('loading')
    getPrediction(collectInputs(inputs))
      .then(result => setPrediction(result))
      .catch((error: unknown) => setStatus('error', error instanceof Error ? error.message : 'Prediction failed'))
  }

  return (
    <section aria-label="Patient inputs" className="patient-panel panel">
      <header className="panel-heading"><div className="section-title"><Icon name="person" size={17} /><h2>Patient profile</h2></div><span className="count-badge">54 inputs</span></header>
      <div className="patient-summary"><span className="patient-avatar"><Icon name="person" size={22} /></span><div><strong>Clinical assessment</strong><span>{String(inputs.Age ?? 59)} years <i /> {String(inputs.Sex ?? 'Male')}</span></div><span className="profile-dot" /></div>
      <div className="form-intro"><span className="eyebrow">CLINICAL PARAMETERS</span><p>Start with the patient’s details.<br />Expand a section to refine the profile.</p></div>
      <div className="patient-fields" aria-busy={busy}>
        {FEATURE_GROUPS.map((group, index) => {
          const features = FEATURES.filter(f => f.group === group)
          return <details key={group} open={index === 0} className="feature-group">
            <summary><span className="group-number">{String(index + 1).padStart(2, '0')}</span><span>{group}</span><span className="group-count">{features.length}</span><Icon name="down" size={13} /></summary>
            <div className="field-grid"><fieldset disabled={busy}>
              {features.map(feature => <Field key={feature.name} feature={feature} value={inputs[feature.name] ?? feature.default} onChange={value => setInputs({ [feature.name]: value })} />)}
            </fieldset></div>
          </details>
        })}
      </div>
      <footer className="patient-actions">
        {validationError && <p role="alert" className="form-error">{validationError}</p>}
        <p className="default-note"><Icon name="info" size={13} /> Cohort defaults, not a healthy profile</p>
        <button type="button" onClick={run} disabled={busy} className="button button-primary run-button"><Icon name={busy ? 'rotate' : 'spark'} size={17} className={busy ? 'spin' : ''} />{busy ? 'Analyzing profile…' : 'Run assessment'}<Icon name="arrow" size={17} /></button>
        <button type="button" disabled={busy} className="reset-inputs" onClick={() => { setInputs(defaultInputs()); setValidationError(null) }}><Icon name="reset" size={13} /> Reset to defaults</button>
      </footer>
    </section>
  )
}

function Field({ feature, value, onChange }: { feature: FeatureDef; value: InputValue; onChange: (value: number | string) => void }) {
  const id = `f-${feature.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`
  const binary = feature.kind === 'number' && feature.min === 0 && feature.max === 1
  return <div className={`form-field ${binary ? 'binary-field' : ''}`}>
    <label htmlFor={id}>{feature.label}</label>
    {feature.kind === 'category' ? <select id={id} value={String(value)} onChange={event => onChange(event.target.value)}>
      {feature.options.map(option => <option key={option} value={option}>{option === 'N' ? 'No' : option === 'Y' ? 'Yes' : option}</option>)}
    </select> : binary ? <select id={id} value={String(value)} onChange={event => onChange(Number(event.target.value))}><option value="0">No</option><option value="1">Yes</option></select> : <div className="number-input"><input id={id} type="number" min={feature.min} max={feature.max} step={feature.step} value={value === '' ? '' : Number(value)} onChange={event => onChange(event.target.value === '' ? '' : Number(event.target.value))} />{feature.unit && <span>{feature.unit}</span>}</div>}
  </div>
}
