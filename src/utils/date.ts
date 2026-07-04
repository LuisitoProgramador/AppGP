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

export function isCurrentMonth(date: Date): boolean {
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
  )
}

export const APP_TIMEZONE = 'America/Mexico_City'

function getCalendarDateInTimezone(date: Date, timeZone = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** True si la fecha del gasto es anterior al día de hoy en America/Mexico_City. */
export function isGastoFechaPasada(
  fecha: string | Date,
  hoy = new Date(),
  timeZone = APP_TIMEZONE,
): boolean {
  const gastoDate = getCalendarDateInTimezone(new Date(fecha), timeZone)
  const hoyDate = getCalendarDateInTimezone(hoy, timeZone)
  return gastoDate < hoyDate
}

export function shiftMonth(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1)
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  const day = result.getDate()
  result.setMonth(result.getMonth() + months)
  if (result.getDate() !== day) {
    result.setDate(0)
  }
  return result
}

export function toMonthInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function fromMonthInputValue(value: string): Date {
  const [year, month] = value.split('-').map(Number)
  return new Date(year, month - 1, 1)
}
