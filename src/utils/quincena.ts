import type { GastoRecurrente } from '../types/gasto'
import { getQuincenaPeriodo, type QuincenaPeriodo } from './date'

export type { QuincenaPeriodo }

export function getQuincenaRange(date = new Date()) {
  const year = date.getFullYear()
  const month = date.getMonth()

  if (date.getDate() <= 15) {
    return {
      periodo: 1 as const,
      inicio: new Date(year, month, 1),
      fin: new Date(year, month, 16),
    }
  }

  return {
    periodo: 2 as const,
    inicio: new Date(year, month, 16),
    fin: new Date(year, month + 1, 1),
  }
}

export function isDateInQuincena(fecha: string | Date, reference = new Date()): boolean {
  const { inicio, fin } = getQuincenaRange(reference)
  const date = new Date(fecha)
  return date >= inicio && date < fin
}

export function sumRecibosPendientesQuincena(
  recurrentes: GastoRecurrente[],
  diaActual: number,
): number {
  const enPrimeraQuincena = diaActual <= 15

  return recurrentes
    .filter((item) => {
      if (item.dia_mes <= diaActual) return false
      if (enPrimeraQuincena) return item.dia_mes <= 15
      return true
    })
    .reduce((sum, item) => sum + Number(item.monto), 0)
}

export { getQuincenaPeriodo }
