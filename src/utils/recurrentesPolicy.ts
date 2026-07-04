import { getYearMonthKey } from './date'

export function getEffectiveBillingDay(diaMes: number, year: number, month: number): number {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  return Math.min(diaMes, daysInMonth)
}

export function shouldRegisterRecurringToday(
  diaMes: number,
  ultimoRegistro: string | null,
  now: Date = new Date(),
): boolean {
  if (alreadyRegisteredThisMonth(ultimoRegistro, now)) return false

  const effectiveDay = getEffectiveBillingDay(diaMes, now.getFullYear(), now.getMonth())
  return now.getDate() >= effectiveDay
}

export function alreadyRegisteredThisMonth(
  ultimoRegistro: string | null,
  now: Date = new Date(),
): boolean {
  if (!ultimoRegistro) return false

  return getYearMonthKey(new Date(ultimoRegistro)) === getYearMonthKey(now)
}
