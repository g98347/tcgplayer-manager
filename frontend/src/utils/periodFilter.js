export function normalizeDate(value) {
  if (!value) return null
  const text = String(value).trim()
  const embeddedIso = text.match(/(\d{4}-\d{2}-\d{2})/)
  if (embeddedIso) return embeddedIso[1]
  const slashDate = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (slashDate) {
    const month = slashDate[1].padStart(2, '0')
    const day = slashDate[2].padStart(2, '0')
    const year = slashDate[3].length === 2 ? `20${slashDate[3]}` : slashDate[3]
    return `${year}-${month}-${day}`
  }
  const dayNameMonthFormat = /(\w+),\s+(\d+)\s+(\w+)\s+(\d+)/i
  const match = text.match(dayNameMonthFormat)
  if (match) {
    const months = {
      january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
      july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
    }
    const day = match[2].padStart(2, '0')
    const month = months[match[3].toLowerCase()]
    return month ? `${match[4]}-${month}-${day}` : null
  }
  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().split('T')[0]
}

export function isDateInPeriod(value, period = 'all') {
  const normalized = normalizeDate(value)
  if (!normalized) return false
  if (period === 'all') return true
  const date = new Date(`${normalized}T00:00:00`)
  const now = new Date()
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfThisYear = new Date(now.getFullYear(), 0, 1)

  switch (period) {
    case 'this_month':
      return date >= startOfThisMonth && date <= now
    case 'this_year':
      return date >= startOfThisYear && date <= now
    case 'last_6_months':
      return date >= new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
    case 'last_12_months':
      return date >= new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    default:
      return true
  }
}
