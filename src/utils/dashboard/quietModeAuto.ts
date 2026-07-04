import { getCalendarDay } from '../date'
import { getEffectiveBillingDay } from '../dashboard/recurrentesPolicy'

export const UMBRAL_SEGURIDAD = 2000

export function isFinDeSemana(fecha: Date): boolean {
  const dia = fecha.getDay()
  return dia === 0 || dia === 6
}

export function isDiaDePago(fecha: Date, diaPago: number | null | undefined): boolean {
  if (diaPago == null) return false
  const effectiveDay = getEffectiveBillingDay(diaPago, fecha.getFullYear(), fecha.getMonth())
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
