import type { OptimisticGasto, PendingGasto } from '../../types/gasto'
import { formatMonthLabel, getYearMonthKey, monthDateToBucketKey, shiftMonth } from '../date'
import { expandPendingToLineItems, filterPendingNotInOptimistic } from './optimisticGastos'

export interface MsiCompromisoMes {
  mes: Date
  label: string
  comprometido: number
  limite: number
  disponibleReal: number
}

interface GastoMsiRow {
  monto: number
  fecha: string
}

function bucketRowsByMonth(rows: GastoMsiRow[]): Map<string, number> {
  const buckets = new Map<string, number>()
  for (const row of rows) {
    const key = getYearMonthKey(new Date(row.fecha))
    buckets.set(key, (buckets.get(key) ?? 0) + row.monto)
  }
  return buckets
}

function sumMsiInMonth(buckets: Map<string, number>, month: Date): number {
  return buckets.get(monthDateToBucketKey(month)) ?? 0
}

export function calcularCompromisosMsi(
  gastosMsi: GastoMsiRow[],
  optimisticGastos: OptimisticGasto[],
  limiteMensual: number,
  desde: Date = new Date(),
  meses = 4,
  pendingGastos: PendingGasto[] = [],
): MsiCompromisoMes[] {
  const pendingMsi = filterPendingNotInOptimistic(pendingGastos, optimisticGastos)
    .filter((item) => item.msiInstallments?.length)
    .flatMap(expandPendingToLineItems)

  const allRows: GastoMsiRow[] = [
    ...gastosMsi,
    ...optimisticGastos
      .filter((g) => g.es_msi)
      .map((g) => ({ monto: g.monto, fecha: g.fecha })),
    ...pendingMsi,
  ]

  const buckets = bucketRowsByMonth(allRows)
  const baseMonth = new Date(desde.getFullYear(), desde.getMonth(), 1)

  return Array.from({ length: meses }, (_, index) => {
    const mes = shiftMonth(baseMonth, index)
    const comprometido = sumMsiInMonth(buckets, mes)
    const disponibleReal = limiteMensual - comprometido

    return {
      mes,
      label: formatMonthLabel(mes),
      comprometido,
      limite: limiteMensual,
      disponibleReal,
    }
  })
}
