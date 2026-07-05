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
import { monthQueryKey, queryKeys } from '../../lib/queryKeys'
import {
  buildLocalHistorialItems,
  buildSyncedHistorialItems,
  mergePreSortedHistorial,
} from '../../utils/gastos/historialMerge'

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

  const syncedItems = useMemo(() => {
    const ingresosItems = query.data?.pages[0]?.ingresos ?? []
    return buildSyncedHistorialItems(query.data?.pages, ingresosItems, categoriaFiltro)
  }, [query.data, categoriaFiltro])

  const localItems = useMemo(
    () =>
      buildLocalHistorialItems(
        optimisticGastos,
        pendingGastos,
        pendingIngresos,
        selectedMonth,
        categoriaFiltro,
        debouncedBusqueda,
      ),
    [
      optimisticGastos,
      pendingGastos,
      pendingIngresos,
      selectedMonth,
      categoriaFiltro,
      debouncedBusqueda,
    ],
  )

  const items = useMemo(() => {
    if (localItems.length === 0) return syncedItems
    if (syncedItems.length === 0) return localItems
    return mergePreSortedHistorial(localItems, syncedItems)
  }, [localItems, syncedItems])

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
