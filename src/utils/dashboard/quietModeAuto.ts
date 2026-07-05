import { getCalendarDay, getYearMonthKey } from '../date'
import { getEffectiveBillingDay } from '../dashboard/recurrentesPolicy'

export const UMBRAL_SEGURIDAD = 2000

export function isFinDeSemana(fecha: Date): boolean {
  const dia = fecha.getDay()
  return dia === 0 || dia === 6
}

export function isDiaDePago(fecha: Date, diaPago: number | null | undefined): boolean {
  if (diaPago == null) return false
  const yearMonth = getYearMonthKey(fecha)
  const year = Number(yearMonth.slice(0, 4))
  const month = Number(yearMonth.slice(5, 7)) - 1
  const effectiveDay = getEffectiveBillingDay(diaPago, year, month)
  return getCalendarDay(fecha) === effectiveDay
}

export function shouldAutoActivarModoTranquilo(params: {
  disponible: number | null | undefined
  diaPago: number | null | undefined
  fecha?: Date
}): boolean {
  const { disponible, diaPago, fecha = new Date() } = params

  if (disponible == null || disponible <= UMBRAL_SEGURIDAD) return false

  return isFinDeSemana(fecha) || isDiaDePago(fecha, diaPago)
}
