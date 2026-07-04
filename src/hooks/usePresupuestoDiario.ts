import { useMemo } from 'react'
import type { GastoRecurrente, OptimisticGasto, PendingGasto } from '../types/gasto'
import { getCalendarDay, getDaysRemainingInMonth } from '../utils/date'
import { expandPendingToLineItems, filterPendingNotInOptimistic } from '../utils/gastos/optimisticGastos'
import {
  calcSafeToSpend,
  sumMsiPendientesRestoMes,
  sumRecibosPendientes,
} from '../utils/core/safeToSpend'

interface MsiRow {
  monto: number
  fecha: string
}

export function usePresupuestoDiario(params: {
  limiteMensual: number
  gastoTotal: number
  recurrentes: GastoRecurrente[]
  gastosMsi: MsiRow[]
  optimisticGastos: OptimisticGasto[]
  pendingGastos: PendingGasto[]
  esMesActual: boolean
  diaActual?: number
}) {
  const {
    limiteMensual,
    gastoTotal,
    recurrentes,
    gastosMsi,
    optimisticGastos,
    pendingGastos,
    esMesActual,
    diaActual = getCalendarDay(new Date()),
  } = params

  return useMemo(() => {
    if (!esMesActual) {
      return {
        disponible: 0,
        presupuestoDiario: 0,
        diasRestantesEfectivos: 0,
        recibosEfectivos: 0,
        msiPendientes: 0,
        disponibleBruto: 0,
      }
    }

    const now = new Date()
    const diasRestantes = getDaysRemainingInMonth()
    const recibosPendientes = sumRecibosPendientes(recurrentes, now)

    const pendingMsi = filterPendingNotInOptimistic(pendingGastos, optimisticGastos)
      .filter((item) => item.msiInstallments?.length)
      .flatMap(expandPendingToLineItems)

    const allMsiRows: MsiRow[] = [
      ...gastosMsi,
      ...optimisticGastos
        .filter((g) => g.es_msi)
        .map((g) => ({ monto: g.monto, fecha: g.fecha })),
      ...pendingMsi,
    ]

    const msiPendientes = sumMsiPendientesRestoMes(allMsiRows, diaActual)

    const safeToSpend = calcSafeToSpend({
      limiteMensual,
      gastoTotal,
      recibosPendientes,
      msiPendientes,
      diasRestantes,
    })

    return {
      disponible: safeToSpend.disponible,
      presupuestoDiario: safeToSpend.presupuestoDiario,
      diasRestantesEfectivos: diasRestantes,
      recibosEfectivos: recibosPendientes,
      msiPendientes: safeToSpend.msiPendientes,
      disponibleBruto: safeToSpend.disponibleBruto,
    }
  }, [
    limiteMensual,
    gastoTotal,
    recurrentes,
    gastosMsi,
    optimisticGastos,
    pendingGastos,
    esMesActual,
    diaActual,
  ])
}
