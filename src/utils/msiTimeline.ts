import { getMonthFechaBounds, shiftMonth } from './date'

export interface GastoMsiTimelineRow {
  monto: number
  fecha: string
}

/** Ventana de MSI que ya trae el dashboard (mes actual + 3 siguientes). */
export function isMonthInMsiCompromisosWindow(month: Date, now = new Date()): boolean {
  const anchor = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1)
  const windowEnd = shiftMonth(anchor, 4)
  return monthStart >= anchor && monthStart < windowEnd
}

export function filterMsiForMonth(
  gastos: GastoMsiTimelineRow[],
  month: Date,
): GastoMsiTimelineRow[] {
  const { inicio, fin } = getMonthFechaBounds(month)
  return gastos.filter((item) => item.fecha >= inicio && item.fecha < fin)
}
