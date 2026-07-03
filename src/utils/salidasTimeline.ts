import type { GastoRecurrente } from '../types/gasto'
import { getEffectiveBillingDay } from './recurrentesPolicy'
import { formatCurrency } from './formatCurrency'

export interface SalidaTimelineItem {
  dia: number
  etiqueta: string
  monto: number
  tipo: 'recurrente' | 'msi'
}

export function buildSalidasTimeline(
  recurrentes: GastoRecurrente[],
  gastosMsiMes: { monto: number; fecha: string }[],
  mes: Date = new Date(),
): SalidaTimelineItem[] {
  const year = mes.getFullYear()
  const month = mes.getMonth()
  const items: SalidaTimelineItem[] = []

  for (const recurrente of recurrentes) {
    const dia = getEffectiveBillingDay(recurrente.dia_mes, year, month)
    items.push({
      dia,
      etiqueta: recurrente.descripcion,
      monto: Number(recurrente.monto),
      tipo: 'recurrente',
    })
  }

  for (const gasto of gastosMsiMes) {
    const fecha = new Date(gasto.fecha)
    if (fecha.getFullYear() !== year || fecha.getMonth() !== month) continue
    items.push({
      dia: fecha.getDate(),
      etiqueta: 'Cuota MSI',
      monto: Number(gasto.monto),
      tipo: 'msi',
    })
  }

  return items.sort((a, b) => a.dia - b.dia || a.etiqueta.localeCompare(b.etiqueta))
}

export function formatSalidaMonto(monto: number): string {
  return formatCurrency(monto)
}
