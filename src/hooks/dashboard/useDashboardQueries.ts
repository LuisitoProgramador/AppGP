import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthSession, useGastosRefreshState } from '../../contexts'
import { fetchDashboardData } from '../../services/dashboard/fetchDashboard'
import { monthQueryKey, queryKeys } from '../../lib/queryKeys'
import type {
  DashboardQueryActions,
  DashboardQueryState,
  UseDashboardDataOptions,
} from './dashboardTypes'
import { useDashboardRecurrentes } from './useDashboardRecurrentes'

export function useDashboardQueries(
  selectedMonth: Date,
  options: UseDashboardDataOptions = {},
): DashboardQueryState & DashboardQueryActions {
  const lite = options.lite ?? false
  const { user } = useAuthSession()
  const { refreshKey } = useGastosRefreshState()

  const query = useQuery({
    queryKey: [...queryKeys.dashboard(user?.id, monthQueryKey(selectedMonth), lite), refreshKey],
    queryFn: () => fetchDashboardData(user!.id, selectedMonth, lite),
    enabled: Boolean(user),
  })

  const data = query.data
  const patronGastos = data?.patronGastos ?? []

  const { recurrentes, recurrenteSugerido, setRecurrenteSugerido } = useDashboardRecurrentes(
    patronGastos,
    lite,
  )

  return useMemo(
    () => ({
      cargando: query.isLoading,
      error: data?.fatalError ?? data?.partialError ?? (query.error ? String(query.error) : null),
      resumenMensual: data?.resumenMensual ?? [],
      limiteMensual: data?.limiteMensual ?? 10000,
      ingresoMensualTotal: data?.ingresoMensualTotal ?? null,
      patrimonioLiquido: data?.patrimonioLiquido ?? null,
      recurrentes,
      gastosMsi: data?.gastosMsi ?? [],
      evolucionRows: data?.evolucionRows ?? [],
      gastoTotalResumen: data?.gastoTotalResumen ?? null,
      gastoTotalAntesResumen: data?.gastoTotalAntesResumen ?? null,
      recurrenteSugerido,
      setRecurrenteSugerido,
    }),
    [
      query.isLoading,
      query.error,
      data,
      recurrentes,
      recurrenteSugerido,
      setRecurrenteSugerido,
    ],
  )
}
