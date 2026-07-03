export function getMonthRange(date = new Date()) {
  const inicio = new Date(date.getFullYear(), date.getMonth(), 1)
  const fin = new Date(date.getFullYear(), date.getMonth() + 1, 1)
  return { inicio, fin }
}

export function getDaysRemainingInMonth(date = new Date()): number {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  return Math.max(lastDay - date.getDate() + 1, 1)
}

export function formatMonthLabel(date = new Date(), locale = 'es-MX'): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatShortDate(date: string | Date, locale = 'es-MX'): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}
