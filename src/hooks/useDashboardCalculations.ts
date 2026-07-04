import { useEffect, useMemo } from 'react'
import { useGastosData, useOfflineSync, useQuietMode } from '../contexts'
import { usePresupuestoDiario } from './usePresupuestoDiario'
import { useStableArray } from './useStableArray'
import type { MetaAhorro } from '../types/metaAhorro'
import { agruparPorCategoria } from '../utils/agruparPorCategoria'
import { formatCurrency } from '../utils/formatCurrency'
import {
  formatMonthLabel,
  getDaysRemainingInMonth,
  getQuincenaPeriodo,
  isCurrentMonth,
} from '../utils/date'
import { buildEvolucionMensual } from '../utils/evolucionMensual'
import { mergeResumenWithOptimistic, expandPendingToLineItems, filterPendingNotInOptimistic } from '../utils/optimisticGastos'
import { calcularCompromisosMsi } from '../utils/msiCompromisos'
import { calcularSaludAhorro } from '../utils/saludAhorro'
import { shouldShowBurnRateAlert } from '../utils/burnRate'
import { isDateInQuincena } from '../utils/quincena'
import { proyectarDiaAgotamiento } from '../utils/limitProjection'
import { calcProyeccionCierre } from '../utils/proyeccionCierre'
import {
  buildResumenFinMes,
  mesParaResumenFinMes,
  shouldShowResumenFinMes,
} from '../utils/resumenFinMes'
import type { DashboardQueryState } from './dashboardTypes'

interface DashboardCalculationsInput extends DashboardQueryState {
  selectedMonth: Date
  metas: MetaAhorro[]
  modoViaje: boolean
  vistaQuincenal: boolean
  cargando: boolean
}

export function useDashboardCalculations({
  selectedMonth,
  metas,
  modoViaje,
  vistaQuincenal,
  cargando,
  resumenMensual,
  limiteMensual,
  gastosMsi,
  evolucionRows,
  recurrentes,
  gastoQuincenaBase,
  gastoTotalResumen,
  gastoTotalAntesResumen,
}: DashboardCalculationsInput) {
  const { optimisticGastos } = useGastosData()
  const { pendingGastos } = useOfflineSync()
  const { modoTranquilo, reportDisponible } = useQuietMode()

  const mesLabel = useMemo(() => formatMonthLabel(selectedMonth), [selectedMonth])
  const esMesActual = useMemo(() => isCurrentMonth(selectedMonth), [selectedMonth])

  const resumen = useMemo(
    () =>
      agruparPorCategoria(
        mergeResumenWithOptimistic(
          resumenMensual,
          optimisticGastos,
          selectedMonth,
          pendingGastos,
        ),
      ),
    [resumenMensual, optimisticGastos, pendingGastos, selectedMonth],
  )

  const gastoTotal = useMemo(
    () => resumen.reduce((sum, item) => sum + item.total, 0),
    [resumen],
  )

  const diasRestantes = useMemo(
    () => (esMesActual ? getDaysRemainingInMonth(selectedMonth) : 0),
    [esMesActual, selectedMonth],
  )

  const quincenaPeriodo = useMemo(
    () => (esMesActual ? getQuincenaPeriodo() : null),
    [esMesActual],
  )

  const gastoQuincena = useMemo(() => {
    const optimistic = optimisticGastos
      .filter((gasto) => isDateInQuincena(gasto.fecha))
      .reduce((sum, gasto) => sum + gasto.monto, 0)

    const pending = filterPendingNotInOptimistic(pendingGastos, optimisticGastos)
      .flatMap(expandPendingToLineItems)
      .filter((gasto) => isDateInQuincena(gasto.fecha))
      .reduce((sum, gasto) => sum + gasto.monto, 0)

    return gastoQuincenaBase + optimistic + pending
  }, [gastoQuincenaBase, optimisticGastos, pendingGastos])

  const diaActual = useMemo(() => new Date().getDate(), [])

  const stableRecurrentes = useStableArray(recurrentes)
  const stableGastosMsi = useStableArray(gastosMsi)
  const stableOptimisticGastos = useStableArray(optimisticGastos)
  const stablePendingGastos = useStableArray(pendingGastos)

  const presupuesto = usePresupuestoDiario({
    limiteMensual,
    gastoTotal,
    gastoQuincena,
    recurrentes: stableRecurrentes,
    gastosMsi: stableGastosMsi,
    optimisticGastos: stableOptimisticGastos,
    pendingGastos: stablePendingGastos,
    vistaQuincenal,
    esMesActual,
    diaActual,
  })

  const disponible = presupuesto.disponible
  const presupuestoDiario = presupuesto.presupuestoDiario
  const diasRestantesEfectivos = presupuesto.diasRestantesEfectivos
  const recibosEfectivos = presupuesto.recibosEfectivos
  const msiPendientes = presupuesto.msiPendientes

  useEffect(() => {
    if (esMesActual && !cargando) {
      reportDisponible(disponible)
    } else {
      reportDisponible(null)
    }
  }, [disponible, esMesActual, cargando, reportDisponible])

  const focusView = useMemo(
    () => ({
      presupuestoDiario: formatCurrency(presupuestoDiario),
      disponible: formatCurrency(disponible),
      puedeGastar: disponible >= 0 || modoTranquilo,
    }),
    [presupuestoDiario, disponible, modoTranquilo],
  )

  const burnRateAlerta = useMemo(
    () =>
      !modoViaje &&
      !modoTranquilo &&
      esMesActual &&
      shouldShowBurnRateAlert(gastoTotal, limiteMensual, diaActual),
    [modoViaje, modoTranquilo, esMesActual, gastoTotal, limiteMensual, diaActual],
  )

  const diaAgotamiento = useMemo(
    () =>
      !modoViaje && !modoTranquilo && esMesActual
        ? proyectarDiaAgotamiento(gastoTotal, limiteMensual, diaActual)
        : null,
    [modoViaje, modoTranquilo, esMesActual, gastoTotal, limiteMensual, diaActual],
  )

  const proyeccionCierre = useMemo(
    () =>
      esMesActual
        ? calcProyeccionCierre({
            limiteMensual,
            gastoTotal,
            diaActual,
            diasRestantes,
          })
        : null,
    [esMesActual, limiteMensual, gastoTotal, diaActual, diasRestantes],
  )

  const mostrarResumenFinMes = useMemo(
    () => shouldShowResumenFinMes(selectedMonth),
    [selectedMonth],
  )

  const resumenFinMes = useMemo(() => {
    if (!mostrarResumenFinMes || gastoTotalResumen == null) return null
    return buildResumenFinMes({
      mes: mesParaResumenFinMes(selectedMonth),
      gastoTotalMes: gastoTotalResumen,
      gastoTotalMesAnterior: gastoTotalAntesResumen,
      metas,
    })
  }, [
    mostrarResumenFinMes,
    gastoTotalResumen,
    gastoTotalAntesResumen,
    metas,
    selectedMonth,
  ])

  const saludAhorro = useMemo(
    () =>
      calcularSaludAhorro({
        metas,
        gastoTotal,
        limiteMensual,
        disponible,
      }),
    [metas, gastoTotal, limiteMensual, disponible],
  )

  const compromisosMsi = useMemo(
    () =>
      calcularCompromisosMsi(
        gastosMsi,
        optimisticGastos,
        limiteMensual,
        undefined,
        3,
        pendingGastos,
      ),
    [gastosMsi, optimisticGastos, limiteMensual, pendingGastos],
  )

  const evolucionMensual = useMemo(
    () => buildEvolucionMensual(evolucionRows, optimisticGastos),
    [evolucionRows, optimisticGastos],
  )

  const tieneDatosAnalisis =
    resumen.length > 0 || evolucionMensual.some((item) => item.total > 0)

  return {
    esMesActual,
    mesLabel,
    gastoTotal,
    resumen,
    disponible,
    presupuestoDiario,
    diasRestantesEfectivos,
    recibosEfectivos,
    msiPendientes,
    quincenaPeriodo,
    focusView,
    burnRateAlerta,
    diaAgotamiento,
    proyeccionCierre,
    resumenFinMes,
    saludAhorro,
    compromisosMsi,
    evolucionMensual,
    tieneDatosAnalisis,
  }
}
