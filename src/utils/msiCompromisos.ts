import type { OptimisticGasto, PendingGasto } from '../types/gasto'
import { formatMonthLabel, getMonthRange, shiftMonth } from './date'
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

function sumMsiInMonth(rows: GastoMsiRow[], month: Date): number {
  const { inicio, fin } = getMonthRange(month)
  return rows
    .filter((row) => {
      const fecha = new Date(row.fecha)
      return fecha >= inicio && fecha < fin
    })
    .reduce((sum, row) => sum + row.monto, 0)
}

export function calcularCompromisosMsi(
  gastosMsi: GastoMsiRow[],
  optimisticGastos: OptimisticGasto[],
  limiteMensual: number,
  desde: Date = new Date(),
  meses = 3,
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

  const baseMonth = new Date(desde.getFullYear(), desde.getMonth(), 1)

  return Array.from({ length: meses }, (_, index) => {
    const mes = shiftMonth(baseMonth, index)
    const comprometido = sumMsiInMonth(allRows, mes)
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
