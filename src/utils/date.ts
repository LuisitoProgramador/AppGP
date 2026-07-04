import { getDateTimeFormat } from './intlCache'

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
  return getDateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date)
}

/** Etiqueta compacta para selectores en pantallas estrechas (ej. "ene 2026"). */
export function formatMonthShortLabel(date = new Date(), locale = 'es-MX'): string {
  const month = getDateTimeFormat(locale, { month: 'short' }).format(date)
  return `${month} ${date.getFullYear()}`
}

export function formatShortDate(date: string | Date, locale = 'es-MX'): string {
  return getDateTimeFormat(locale, {
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

const MX_UTC_OFFSET = '-06:00'

const calendarDateFormatter = getDateTimeFormat('en-CA', {
  timeZone: APP_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function getCalendarDateInTimezone(date: Date, timeZone = APP_TIMEZONE): string {
  if (timeZone === APP_TIMEZONE) {
    return calendarDateFormatter.format(date)
  }
  return getDateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/** Fecha de gasto anclada al mediodía en México para evitar cambios de mes por UTC. */
export function toGastoFecha(date = new Date(), timeZone = APP_TIMEZONE): string {
  const cal = getCalendarDateInTimezone(date, timeZone)
  return `${cal}T12:00:00${MX_UTC_OFFSET}`
}

export function getYearMonthKey(date: Date, timeZone = APP_TIMEZONE): string {
  return getCalendarDateInTimezone(date, timeZone).slice(0, 7)
}

/** Día del mes (1–31) en el calendario de la zona indicada. */
export function getCalendarDay(date: Date | string, timeZone = APP_TIMEZONE): number {
  const cal = getCalendarDateInTimezone(new Date(date), timeZone)
  return Number(cal.split('-')[2])
}

/** Clave YYYY-MM para agrupar filas por mes calendario (America/Mexico_City). */
export function monthDateToBucketKey(month: Date): string {
  return `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`
}

export function isFechaInMonth(fecha: string | Date, month: Date, timeZone = APP_TIMEZONE): boolean {
  const target = `${month.getFullYear()}-${pad2(month.getMonth() + 1)}`
  return getYearMonthKey(new Date(fecha), timeZone) === target
}

/** Límites inclusivos/exclusivos para filtrar timestamptz por mes calendario en México. */
export function getMonthFechaBounds(date: Date, timeZone = APP_TIMEZONE): { inicio: string; fin: string } {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year

  if (timeZone === APP_TIMEZONE) {
    return {
      inicio: `${year}-${pad2(month)}-01T00:00:00${MX_UTC_OFFSET}`,
      fin: `${nextYear}-${pad2(nextMonth)}-01T00:00:00${MX_UTC_OFFSET}`,
    }
  }

  const { inicio, fin } = getMonthRange(date)
  return { inicio: inicio.toISOString(), fin: fin.toISOString() }
}

export function getMonthBucketBounds(date: Date): { inicio: string; fin: string } {
  return getMonthFechaBounds(date)
}

/** Límites del día calendario en México para filtrar gastos del día. */
export function getDayFechaBounds(date = new Date(), timeZone = APP_TIMEZONE): { inicio: string; fin: string } {
  const cal = getCalendarDateInTimezone(date, timeZone)
  const [year, month, day] = cal.split('-').map(Number)
  const nextDay = new Date(year, month - 1, day + 1)
  const nextCal = getCalendarDateInTimezone(nextDay, timeZone)

  if (timeZone === APP_TIMEZONE) {
    return {
      inicio: `${cal}T00:00:00${MX_UTC_OFFSET}`,
      fin: `${nextCal}T00:00:00${MX_UTC_OFFSET}`,
    }
  }

  const inicio = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const fin = new Date(inicio)
  fin.setDate(fin.getDate() + 1)
  return { inicio: inicio.toISOString(), fin: fin.toISOString() }
}

export function addMonthsInTimezone(date: Date, months: number, timeZone = APP_TIMEZONE): string {
  const cal = getCalendarDateInTimezone(date, timeZone)
  const [year, month, day] = cal.split('-').map(Number)
  const shifted = new Date(year, month - 1 + months, day)
  return toGastoFecha(shifted, timeZone)
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
