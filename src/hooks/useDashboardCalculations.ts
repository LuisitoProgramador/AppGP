import { useEffect, useMemo } from 'react'
import { useOptimisticGastosState, useOfflineSyncStatus, useQuietMode } from '../contexts'
import { usePresupuestoDiario } from './usePresupuestoDiario'
import { useStableArray } from './useStableArray'
import type { MetaAhorro } from '../types/metaAhorro'
import { agruparPorCategoria } from '../utils/agruparPorCategoria'
import { formatCurrency } from '../utils/formatCurrency'
import {
  formatMonthLabel,
  getDaysRemainingInMonth,
  isCurrentMonth,
} from '../utils/date'
import { buildEvolucionMensual } from '../utils/evolucionMensual'
import { mergeResumenWithOptimistic } from '../utils/optimisticGastos'
import { calcularCompromisosMsi } from '../utils/msiCompromisos'
import { calcularSaludAhorro } from '../utils/saludAhorro'
import { shouldShowBurnRateAlert } from '../utils/burnRate'
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
  cargando: boolean
}

export function useDashboardCalculations({
  selectedMonth,
  metas,
  modoViaje,
  cargando,
  resumenMensual,
  limiteMensual,
  gastosMsi,
  evolucionRows,
  recurrentes,
  gastoTotalResumen,
  gastoTotalAntesResumen,
}: DashboardCalculationsInput) {
  const { optimisticGastos } = useOptimisticGastosState()
  const { pendingGastos } = useOfflineSyncStatus()
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

  const diaActual = useMemo(() => new Date().getDate(), [esMesActual, selectedMonth])

  const stableRecurrentes = useStableArray(recurrentes)
  const stableGastosMsi = useStableArray(gastosMsi)
  const stableOptimisticGastos = useStableArray(optimisticGastos)
  const stablePendingGastos = useStableArray(pendingGastos)

  const presupuesto = usePresupuestoDiario({
    limiteMensual,
    gastoTotal,
    recurrentes: stableRecurrentes,
    gastosMsi: stableGastosMsi,
    optimisticGastos: stableOptimisticGastos,
    pendingGastos: stablePendingGastos,
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

  const stableGastosMsiForCompromisos = useStableArray(gastosMsi)
  const stableOptimisticForCompromisos = useStableArray(optimisticGastos)
  const stablePendingForCompromisos = useStableArray(pendingGastos)
  const stableEvolucionRows = useStableArray(evolucionRows)
  const stableOptimisticForEvolucion = useStableArray(optimisticGastos)

  const compromisosMsi = useMemo(
    () =>
      calcularCompromisosMsi(
        stableGastosMsiForCompromisos,
        stableOptimisticForCompromisos,
        limiteMensual,
        undefined,
        3,
        stablePendingForCompromisos,
      ),
    [stableGastosMsiForCompromisos, stableOptimisticForCompromisos, limiteMensual, stablePendingForCompromisos],
  )

  const evolucionMensual = useMemo(
    () => buildEvolucionMensual(stableEvolucionRows, stableOptimisticForEvolucion),
    [stableEvolucionRows, stableOptimisticForEvolucion],
  )

  const tieneDatosAnalisis = useMemo(
    () => resumen.length > 0 || evolucionMensual.some((item) => item.total > 0),
    [resumen, evolucionMensual],
  )

  return useMemo(
    () => ({
      esMesActual,
      mesLabel,
      gastoTotal,
      resumen,
      disponible,
      presupuestoDiario,
      diasRestantesEfectivos,
      recibosEfectivos,
      msiPendientes,
      focusView,
      burnRateAlerta,
      diaAgotamiento,
      proyeccionCierre,
      resumenFinMes,
      saludAhorro,
      compromisosMsi,
      evolucionMensual,
      tieneDatosAnalisis,
    }),
    [
      esMesActual,
      mesLabel,
      gastoTotal,
      resumen,
      disponible,
      presupuestoDiario,
      diasRestantesEfectivos,
      recibosEfectivos,
      msiPendientes,
      focusView,
      burnRateAlerta,
      diaAgotamiento,
      proyeccionCierre,
      resumenFinMes,
      saludAhorro,
      compromisosMsi,
      evolucionMensual,
      tieneDatosAnalisis,
    ],
  )
}
