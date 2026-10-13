import type { CSSProperties } from 'react'

const paths = {
  pulse: 'M2 12h5l3-8 4 16 3-8h5',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  chevron: 'm9 5 7 7-7 7',
  down: 'm6 9 6 6 6-6',
  reset: 'M3 10a9 9 0 1 1 2 8M3 4v6h6',
  download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  expand: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
  close: 'm6 6 12 12M6 18 18 6',
  plus: 'M5 12h14M12 5v14',
  minus: 'M5 12h14',
  rotate: 'M20 7v5h-5M4 17v-5h5M6.1 6a8 8 0 0 1 13.2 2M4.7 16a8 8 0 0 0 13.2 2',
  tag: 'M3 3h7l11 11-7 7L3 10V3ZM7 7h.01',
  layers: 'm12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5',
  person: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2',
  shield: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm-4 9 3 3 5-6',
  info: 'M12 16v-4m0-4h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  spark: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z',
  check: 'm5 12 4 4L19 6',
  chart: 'M4 3v18h17M8 16l4-5 4 2 5-8',
} as const

export type IconName = keyof typeof paths

export function Icon({ name, size = 18, className = '', style }: {
  name: IconName
  size?: number
  className?: string
  style?: CSSProperties
}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true"><path d={paths[name]} /></svg>
}
