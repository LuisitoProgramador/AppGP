import type { OptimisticGasto } from '../types/gasto'
import { formatMonthLabel, getMonthRange, shiftMonth } from './date'

export interface MesTotal {
  mes: Date
  label: string
  total: number
}

interface ResumenRow {
  mes: string
  total: number
}

function sumOptimisticInMonth(optimisticGastos: OptimisticGasto[], month: Date): number {
  const { inicio, fin } = getMonthRange(month)
  return optimisticGastos
    .filter((gasto) => {
      const fecha = new Date(gasto.fecha)
      return fecha >= inicio && fecha < fin
    })
    .reduce((sum, gasto) => sum + gasto.monto, 0)
}

export function buildEvolucionMensual(
  resumenRows: ResumenRow[],
  optimisticGastos: OptimisticGasto[],
  desde: Date = new Date(),
  meses = 4,
): MesTotal[] {
  const baseMonth = new Date(desde.getFullYear(), desde.getMonth(), 1)

  return Array.from({ length: meses }, (_, index) => {
    const mes = shiftMonth(baseMonth, -(meses - 1 - index))
    const { inicio, fin } = getMonthRange(mes)

    const dbTotal = resumenRows
      .filter((row) => {
        const rowMes = new Date(row.mes)
        return rowMes >= inicio && rowMes < fin
      })
      .reduce((sum, row) => sum + row.total, 0)

    const optimisticTotal = sumOptimisticInMonth(optimisticGastos, mes)

    return {
      mes,
      label: formatMonthLabel(mes, 'es-MX').replace(/ de \d{4}$/, ''),
      total: dbTotal + optimisticTotal,
    }
  })
}
