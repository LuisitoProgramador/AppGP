import { getYearMonthKey } from '../date'

export function getEffectiveBillingDay(diaMes: number, year: number, month: number): number {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  return Math.min(diaMes, daysInMonth)
}

/** Fecha efectiva de cobro; si cae en fin de semana, se adelanta al viernes anterior. */
export function getBillingDate(diaMes: number, year: number, month: number): Date {
  const effectiveDay = getEffectiveBillingDay(diaMes, year, month)
  const date = new Date(year, month, effectiveDay)
  const dayOfWeek = date.getDay()

  if (dayOfWeek === 6) {
    date.setDate(date.getDate() - 1)
  } else if (dayOfWeek === 0) {
    date.setDate(date.getDate() - 2)
  }

  return date
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function shouldRegisterRecurringToday(
  diaMes: number,
  ultimoRegistro: string | null,
  now: Date = new Date(),
): boolean {
  if (alreadyRegisteredThisMonth(ultimoRegistro, now)) return false

  const billingDate = getBillingDate(diaMes, now.getFullYear(), now.getMonth())
  return startOfLocalDay(now) >= billingDate
}

export function alreadyRegisteredThisMonth(
  ultimoRegistro: string | null,
  now: Date = new Date(),
): boolean {
  if (!ultimoRegistro) return false

  return getYearMonthKey(new Date(ultimoRegistro)) === getYearMonthKey(now)
}

export interface RecurrenteMatchInput {
  descripcion: string
  monto: number
  categoria: string
}

/** Evita doble cargo si el usuario ya registró manualmente el mismo recibo este mes. */
export function matchesRecurrenteGasto(
  gasto: { descripcion: string | null; monto: number; categoria: string },
  recurrente: RecurrenteMatchInput,
): boolean {
  const gastoDesc = (gasto.descripcion ?? '').trim().toLowerCase()
  const recurrenteDesc = recurrente.descripcion.trim().toLowerCase()
  if (gastoDesc !== recurrenteDesc) return false
  if (gasto.categoria !== recurrente.categoria) return false
  return Math.abs(Number(gasto.monto) - recurrente.monto) < 0.01
}
