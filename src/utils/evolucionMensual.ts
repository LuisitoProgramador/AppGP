import type { OptimisticGasto } from '../types/gasto'
import { formatMonthShortLabel, shiftMonth } from './date'

export interface MesTotal {
  mes: Date
  label: string
  total: number
}

interface ResumenRow {
  mes: string
  total: number
}

function bucketOptimisticByMonth(optimisticGastos: OptimisticGasto[]): Map<string, number> {
  const buckets = new Map<string, number>()
  for (const gasto of optimisticGastos) {
    const fecha = new Date(gasto.fecha)
    const key = `${fecha.getFullYear()}-${fecha.getMonth()}`
    buckets.set(key, (buckets.get(key) ?? 0) + gasto.monto)
  }
  return buckets
}

function bucketResumenByMonth(resumenRows: ResumenRow[]): Map<string, number> {
  const buckets = new Map<string, number>()
  for (const row of resumenRows) {
    const rowMes = new Date(row.mes)
    const key = `${rowMes.getFullYear()}-${rowMes.getMonth()}`
    buckets.set(key, (buckets.get(key) ?? 0) + row.total)
  }
  return buckets
}

function sumInMonth(buckets: Map<string, number>, month: Date): number {
  const key = `${month.getFullYear()}-${month.getMonth()}`
  return buckets.get(key) ?? 0
}

export function buildEvolucionMensual(
  resumenRows: ResumenRow[],
  optimisticGastos: OptimisticGasto[],
  desde: Date = new Date(),
  meses = 4,
): MesTotal[] {
  const dbBuckets = bucketResumenByMonth(resumenRows)
  const optimisticBuckets = bucketOptimisticByMonth(optimisticGastos)
  const baseMonth = new Date(desde.getFullYear(), desde.getMonth(), 1)

  return Array.from({ length: meses }, (_, index) => {
    const mes = shiftMonth(baseMonth, -(meses - 1 - index))
    const dbTotal = sumInMonth(dbBuckets, mes)
    const optimisticTotal = sumInMonth(optimisticBuckets, mes)

    return {
      mes,
      label: formatMonthShortLabel(mes, 'es-MX'),
      total: dbTotal + optimisticTotal,
    }
  })
}
