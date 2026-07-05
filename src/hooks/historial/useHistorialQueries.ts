import { useCallback, useMemo, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import {
  useAuthSession,
  useOptimisticGastosState,
  useOfflineSyncStatus,
} from '../../contexts'
import { useCategorias } from '../useCategorias'
import { useDebouncedValue } from '../useDebouncedValue'
import { fetchHistorialGastosPage } from '../../services/historial/fetchHistorial'
import type { HistorialItem } from '../../components/historial/historialTypes'
import { filterPendingIngresos } from '../../utils/gastos/filterPendingIngresos'
import {
  filterOptimisticGastos,
  filterPendingGastos,
  filterPendingNotInOptimistic,
} from '../../utils/gastos/optimisticGastos'
import { monthQueryKey, queryKeys } from '../../lib/queryKeys'

function sortByFechaDesc(a: HistorialItem, b: HistorialItem): number {
  return new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
}

function mergeSortedByFechaDesc(
  left: HistorialItem[],
  right: HistorialItem[],
): HistorialItem[] {
  const merged: HistorialItem[] = []
  let i = 0
  let j = 0

  while (i < left.length && j < right.length) {
    if (sortByFechaDesc(left[i], right[j]) <= 0) {
      merged.push(left[i])
      i += 1
    } else {
      merged.push(right[j])
      j += 1
    }
  }

  return merged.concat(left.slice(i), right.slice(j))
}

export function useHistorialQueries() {
  const { user } = useAuthSession()
  const { optimisticGastos } = useOptimisticGastosState()
  const { pendingGastos, pendingIngresos } = useOfflineSyncStatus()
  const { filterOptions } = useCategorias(user?.id)
  const categoriaFilterOptions = useMemo(
    () => [...filterOptions, { value: 'Ingreso', label: 'Ingresos' }],
    [filterOptions],
  )
  const [selectedMonth, setSelectedMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  )
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todas')
  const [busqueda, setBusqueda] = useState('')
  const debouncedBusqueda = useDebouncedValue(busqueda.trim(), 300)

  const monthKey = monthQueryKey(selectedMonth)

  const query = useInfiniteQuery({
    queryKey: queryKeys.historial(user?.id, monthKey, categoriaFiltro, debouncedBusqueda),
    queryFn: ({ pageParam }) =>
      fetchHistorialGastosPage({
        userId: user!.id,
        selectedMonth,
        categoriaFiltro,
        busqueda: debouncedBusqueda,
        page: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.hasMore ? lastPageParam + 1 : undefined,
    enabled: Boolean(user),
  })

  const syncedItems = useMemo(
    () => query.data?.pages.flatMap((page) => page.gastos) ?? [],
    [query.data],
  )

  const ingresosItems = useMemo(
    () => query.data?.pages[0]?.ingresos ?? [],
    [query.data],
  )

  const ingresosVisibles = useMemo(
    () => (categoriaFiltro === 'Todas' || categoriaFiltro === 'Ingreso' ? ingresosItems : []),
    [categoriaFiltro, ingresosItems],
  )

  const syncedSorted = useMemo(
    () => [...syncedItems, ...ingresosVisibles].sort(sortByFechaDesc),
    [syncedItems, ingresosVisibles],
  )

  const localSorted = useMemo(() => {
    const pendientes: HistorialItem[] = filterPendingGastos(
      filterPendingNotInOptimistic(pendingGastos, optimisticGastos),
      selectedMonth,
      categoriaFiltro,
      busqueda,
    ).map((gasto) => ({
      ...gasto,
      pendiente: true as const,
    }))

    const optimistas: HistorialItem[] = filterOptimisticGastos(
      optimisticGastos,
      selectedMonth,
      categoriaFiltro,
      busqueda,
    ).map((gasto) => ({
      ...gasto,
      optimistic: true as const,
    }))

    const pendientesIngresos: HistorialItem[] = filterPendingIngresos(
      pendingIngresos,
      selectedMonth,
      categoriaFiltro,
      busqueda,
    ).map((ingreso) => ({
      ...ingreso,
      tipo: 'ingreso' as const,
      pendiente: true as const,
      fecha: new Date(ingreso.createdAt).toISOString(),
      categoria: 'Ingreso' as const,
    }))

    return [...optimistas, ...pendientes, ...pendientesIngresos].sort(sortByFechaDesc)
  }, [
    optimisticGastos,
    pendingGastos,
    pendingIngresos,
    selectedMonth,
    categoriaFiltro,
    busqueda,
  ])

  const items = useMemo(
    () => mergeSortedByFechaDesc(localSorted, syncedSorted),
    [localSorted, syncedSorted],
  )

  const handleLoadMore = useCallback(() => {
    if (!query.hasNextPage || query.isFetchingNextPage) return
    void query.fetchNextPage()
  }, [query])

  return {
    selectedMonth,
    setSelectedMonth,
    categoriaFiltro,
    setCategoriaFiltro,
    busqueda,
    setBusqueda,
    categoriaFilterOptions,
    items,
    handleLoadMore,
    error: query.error ? String(query.error) : query.data?.pages.find((page) => page.error)?.error ?? null,
    cargando: query.isLoading,
    cargandoMas: query.isFetchingNextPage,
    hasMore: Boolean(query.hasNextPage),
  }
}
