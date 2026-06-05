export function formatCurrency(value) {
  return `$${Number(value || 0).toFixed(2)}`
}

export function formatPercent(value) {
  return `${Number(value || 0).toFixed(2)}%`
}
