/**
 * Data-driven patient input form — all 54 model inputs, grouped the way
 * requirement 1c groups them (demographic / clinical examination / ECG /
 * laboratory / echocardiographic).
 *
 * Fully controlled by the zustand store: no local component state, so the
 * desktop column and the stacked mobile instance below always agree, and the
 * 3D scene never re-renders because a keystroke landed (the scene subscribes
 * to prediction + selection only).
 *
 * "Run prediction" posts the collected values through getPrediction(); while
 * USE_MOCK is true that returns canned numbers, which RiskStrip labels as
 * demo data rather than model output.
 */

import { FEATURES, FEATURE_GROUPS, collectInputs, defaultInputs } from '../api/features'
import type { FeatureDef, InputValue } from '../api/features'
import { getPrediction } from '../api/client'
import { usePatientStore } from '../store/patientStore'

const inputClass =
  'mt-1 w-full rounded-md border border-mist bg-white px-2 py-1 text-xs text-navy transition focus:border-navy focus:outline-none'

interface PatientFormProps {
  /** Extra classes for column placement; the form fills its container. */
  className?: string
}

export function PatientForm({ className = '' }: PatientFormProps) {
  const inputs = usePatientStore((s) => s.inputs)
  const status = usePatientStore((s) => s.status)
  const setInputs = usePatientStore((s) => s.setInputs)
  const setStatus = usePatientStore((s) => s.setStatus)
  const setPrediction = usePatientStore((s) => s.setPrediction)

  const busy = status === 'loading'

  const update = (name: string, value: number | string) =>
    setInputs({ [name]: value })

  const run = () => {
    setStatus('loading')
    getPrediction(collectInputs(inputs))
      .then((prediction) => setPrediction(prediction))
      .catch((error: unknown) =>
        setStatus(
          'error',
          error instanceof Error ? error.message : 'prediction failed',
        ),
      )
  }

  return (
    <section
      aria-label="Patient inputs"
      className={`min-h-0 flex-col rounded-xl border border-mist bg-white ${className}`}
    >
      <header className="border-b border-mist px-4 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-navy">Patient inputs</h2>
          <span className="text-[10px] text-slate">{FEATURES.length} features</span>
        </div>
        <p className="mt-1 text-[10px] leading-relaxed text-slate">
          Demographic, examination, ECG, laboratory and echocardiographic
          values — the same columns the models were trained on.
        </p>
      </header>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {FEATURE_GROUPS.map((group, index) => (
          <details key={group} open={index === 0}>
            <summary className="cursor-pointer rounded-md px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate transition hover:bg-mist hover:text-navy">
              {group}
            </summary>
            <div className="mb-2 mt-1 grid grid-cols-2 gap-2 rounded-lg bg-mist/60 p-2">
              {FEATURES.filter((f) => f.group === group).map((feature) => (
                <Field
                  key={feature.name}
                  feature={feature}
                  value={inputs[feature.name] ?? feature.default}
                  onChange={(value) => update(feature.name, value)}
                />
              ))}
            </div>
          </details>
        ))}
      </div>

      <footer className="space-y-2 border-t border-mist px-4 py-3">
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="w-full rounded-md bg-navy px-3 py-2 text-xs font-semibold text-white transition hover:bg-navy/90 disabled:cursor-wait disabled:opacity-60"
        >
          {busy ? 'Running prediction…' : 'Run prediction'}
        </button>
        <button
          type="button"
          onClick={() => setInputs(defaultInputs())}
          disabled={busy}
          className="w-full rounded-md border border-mist px-3 py-1.5 text-[11px] text-slate transition hover:border-navy/40 hover:text-navy disabled:opacity-60"
        >
          Reset to population defaults
        </button>
      </footer>
    </section>
  )
}

interface FieldProps {
  feature: FeatureDef
  value: InputValue
  onChange: (value: number | string) => void
}

function Field({ feature, value, onChange }: FieldProps) {
  const id = `f-${feature.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`

  if (feature.kind === 'category') {
    return (
      <div className="min-w-0">
        <label htmlFor={id} className="block truncate text-[10px] text-slate">
          {feature.label}
        </label>
        <select
          id={id}
          className={inputClass}
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
        >
          {feature.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block truncate text-[10px] text-slate">
        {feature.label}
        {feature.unit ? ` (${feature.unit})` : ''}
      </label>
      <input
        id={id}
        type="number"
        min={feature.min}
        max={feature.max}
        step={feature.step}
        value={value === '' ? '' : Number(value)}
        onChange={(event) =>
          onChange(event.target.value === '' ? '' : Number(event.target.value))
        }
        className={inputClass}
      />
    </div>
  )
}
