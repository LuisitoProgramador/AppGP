import { useMemo } from 'react'
import type { MetaAhorro } from '../../types/metaAhorro'
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
  const { setRecurrenteSugerido, ...queryState } = queries

  const mutations = useDashboardMutations({
    recurrenteSugerido: queries.recurrenteSugerido,
    setRecurrenteSugerido,
  })

  const calculations = useDashboardCalculations({
    ...queryState,
    selectedMonth,
    metas,
    modoViaje: mutations.modoViaje,
  })

  return useMemo(
    () => ({
      cargando: queries.cargando,
      error: queries.error,
      limiteMensual: queries.limiteMensual,
      ingresoMensualTotal: queries.ingresoMensualTotal,
      porcentajeAhorro: queries.porcentajeAhorro,
      patrimonioLiquido: queries.patrimonioLiquido,
      recurrenteSugerido: queries.recurrenteSugerido,
      recurrentes: queries.recurrentes,
      gastosMsi: queries.gastosMsi,
      ...calculations,
      ...mutations,
    }),
    [queries, calculations, mutations],
  )
}
