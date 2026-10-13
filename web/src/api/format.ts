/** Keep near-zero/near-one predictions from looking like absolute certainty. */
export function probabilityPercent(value: number): string {
  const rounded = (value * 100).toFixed(1)
  if (rounded === '100.0' && value < 1) return '>99.9'
  if (rounded === '0.0' && value > 0) return '<0.1'
  return rounded
}
