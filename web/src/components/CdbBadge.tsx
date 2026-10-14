import { riskBand, riskColor, riskLabel } from '../vessels'
import { probabilityPercent } from '../api/format'

export function CdbBadge({ value, classification }: { value: number | null; classification?: string }) {
  const color = value === null ? '#657168' : riskColor(value)
  const label = value === null ? 'Awaiting prediction' : riskLabel(riskBand(value), 'cad')
  const circumference = Math.PI * 72
  return <div className="overall-risk">
    <div className="risk-ring">
      <svg viewBox="0 0 180 150" aria-hidden="true"><path d="M 27.65 108 A 72 72 0 1 1 152.35 108" fill="none" stroke="var(--color-mist)" strokeWidth="8" strokeLinecap="round" /><path d="M 27.65 108 A 72 72 0 1 1 152.35 108" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference * 4 / 3} strokeDashoffset={circumference * 4 / 3 * (1 - (value ?? 0))} className="risk-ring-progress" /></svg>
      <div className="risk-ring-value"><span aria-label="predicted CAD probability" title={value === null ? undefined : `${(value * 100).toFixed(3)}% predicted probability`}>{value === null ? '—' : probabilityPercent(value)}{value !== null && <small>%</small>}</span><span>Overall CAD probability</span></div>
      <span className="ring-start">0</span><span className="ring-end">100</span>
    </div>
    <span className="risk-band-badge" style={{ color, background: `${color}16`, borderColor: `${color}30` }}><i style={{ background: color }} />{label}</span>
    {classification && <p className="risk-footnote">Model classification: <strong>{classification}</strong><br />At the trained operating threshold; not a diagnosis.</p>}
  </div>
}
