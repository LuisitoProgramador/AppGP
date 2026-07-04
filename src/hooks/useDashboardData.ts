import type { MetaAhorro } from '../types/metaAhorro'
import type { UseDashboardDataOptions } from './dashboardTypes'
import { useDashboardCalculations } from './useDashboardCalculations'
import { useDashboardMutations } from './useDashboardMutations'
import { useDashboardQueries } from './useDashboardQueries'

export type { UseDashboardDataOptions } from './dashboardTypes'

/**
 * Facade que orquesta queries, cálculos y mutaciones del dashboard.
 * Los micro-hooks pueden usarse por separado para aislar re-renders.
 */
export function useDashboardData(
  selectedMonth: Date,
  metas: MetaAhorro[] = [],
  options: UseDashboardDataOptions = {},
) {
  const queries = useDashboardQueries(selectedMonth, options)

  const mutations = useDashboardMutations({
    recurrenteSugerido: queries.recurrenteSugerido,
    setRecurrenteSugerido: queries.setRecurrenteSugerido,
  })

  const calculations = useDashboardCalculations({
    selectedMonth,
    metas,
    modoViaje: mutations.modoViaje,
    cargando: queries.cargando,
    resumenMensual: queries.resumenMensual,
    limiteMensual: queries.limiteMensual,
    ingresoMensualTotal: queries.ingresoMensualTotal,
    patrimonioLiquido: queries.patrimonioLiquido,
    recurrentes: queries.recurrentes,
    gastosMsi: queries.gastosMsi,
    evolucionRows: queries.evolucionRows,
    gastoTotalResumen: queries.gastoTotalResumen,
    gastoTotalAntesResumen: queries.gastoTotalAntesResumen,
    error: queries.error,
    recurrenteSugerido: queries.recurrenteSugerido,
  })

  return {
    cargando: queries.cargando,
    error: queries.error,
    limiteMensual: queries.limiteMensual,
    ingresoMensualTotal: queries.ingresoMensualTotal,
    patrimonioLiquido: queries.patrimonioLiquido,
    recurrenteSugerido: queries.recurrenteSugerido,
    ...calculations,
    ...mutations,
  }
}
