import { riskBand, riskColor, riskLabel } from '../vessels'
import { Icon } from './Icon'
import { probabilityPercent } from '../api/format'

export function GaugeCard({ title, subtitle, value, active, onClick }: {
  title: string; subtitle?: string; value: number | null; active: boolean; onClick?: () => void
}) {
  const color = value === null ? '#718078' : riskColor(value)
  const body = <>
    <div className="vessel-card-top"><span className="vessel-dot" style={{ background: color }} /><strong>{title}</strong><span className="vessel-band">{value === null ? 'Awaiting data' : riskLabel(riskBand(value))}</span><span className="vessel-percent">{value === null ? '—' : probabilityPercent(value)}{value !== null && <small>%</small>}</span><Icon name="chevron" size={13} /></div>
    <div className="vessel-full-name">{subtitle}</div>
    <div className="vessel-track"><span style={{ width: `${(value ?? 0) * 100}%`, background: color }} /></div>
  </>
  const className = `vessel-card ${active ? 'is-active' : ''}`
  return onClick ? <button type="button" className={className} onClick={onClick} aria-pressed={active} aria-label={`${title}: ${value === null ? 'awaiting prediction' : `${probabilityPercent(value)}% predicted stenosis`}. Select vessel.`}>{body}</button> : <div className={className}>{body}</div>
}
