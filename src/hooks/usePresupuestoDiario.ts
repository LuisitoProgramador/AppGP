import { useMemo } from 'react'
import type { GastoRecurrente, OptimisticGasto, PendingGasto } from '../types/gasto'
import { getDaysRemainingInMonth, getDaysRemainingInQuincena } from '../utils/date'
import { expandPendingToLineItems, filterPendingNotInOptimistic } from '../utils/optimisticGastos'
import { getQuincenaRange, sumRecibosPendientesQuincena } from '../utils/quincena'
import {
  calcSafeToSpend,
  sumMsiPendientesRestoMes,
  sumMsiPendientesRestoPeriodo,
  sumRecibosPendientes,
} from '../utils/safeToSpend'

interface MsiRow {
  monto: number
  fecha: string
}

export function usePresupuestoDiario(params: {
  limiteMensual: number
  gastoTotal: number
  gastoQuincena: number
  recurrentes: GastoRecurrente[]
  gastosMsi: MsiRow[]
  optimisticGastos: OptimisticGasto[]
  pendingGastos: PendingGasto[]
  vistaQuincenal: boolean
  esMesActual: boolean
  diaActual?: number
}) {
  const {
    limiteMensual,
    gastoTotal,
    gastoQuincena,
    recurrentes,
    gastosMsi,
    optimisticGastos,
    pendingGastos,
    vistaQuincenal,
    esMesActual,
    diaActual = new Date().getDate(),
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

    const diasRestantes = getDaysRemainingInMonth()
    const diasRestantesQuincena = getDaysRemainingInQuincena()
    const usarVistaQuincenal = vistaQuincenal

    const recibosPendientes = sumRecibosPendientes(recurrentes, diaActual)
    const recibosPendientesQuincena = sumRecibosPendientesQuincena(recurrentes, diaActual)

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

    const msiPendientesMes = sumMsiPendientesRestoMes(allMsiRows, diaActual)
    const { inicio, fin } = getQuincenaRange()
    const msiPendientesQuincena = sumMsiPendientesRestoPeriodo(
      allMsiRows,
      diaActual,
      inicio,
      fin,
    )

    const safeToSpend = calcSafeToSpend({
      limiteMensual: usarVistaQuincenal ? limiteMensual / 2 : limiteMensual,
      gastoTotal: usarVistaQuincenal ? gastoQuincena : gastoTotal,
      recibosPendientes: usarVistaQuincenal ? recibosPendientesQuincena : recibosPendientes,
      msiPendientes: usarVistaQuincenal ? msiPendientesQuincena : msiPendientesMes,
      diasRestantes: usarVistaQuincenal ? diasRestantesQuincena : diasRestantes,
    })

    return {
      disponible: safeToSpend.disponible,
      presupuestoDiario: safeToSpend.presupuestoDiario,
      diasRestantesEfectivos: usarVistaQuincenal ? diasRestantesQuincena : diasRestantes,
      recibosEfectivos: usarVistaQuincenal ? recibosPendientesQuincena : recibosPendientes,
      msiPendientes: safeToSpend.msiPendientes,
      disponibleBruto: safeToSpend.disponibleBruto,
    }
  }, [
    limiteMensual,
    gastoTotal,
    gastoQuincena,
    recurrentes,
    gastosMsi,
    optimisticGastos,
    pendingGastos,
    vistaQuincenal,
    esMesActual,
    diaActual,
  ])
}
