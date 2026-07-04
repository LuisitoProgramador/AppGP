import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  useAuthSession,
  useGastosRefreshState,
  useOfflineSyncStatus,
  useOptimisticGastosState,
} from '../../contexts'
import { useCategorias } from '../useCategorias'
import { listIngresosCuenta } from '../../services/cuentas'
import { supabase } from '../../services/supabase'
import { HISTORIAL_PAGE_SIZE } from '../../types/gasto'
import {
  isHistorialSynced,
  type HistorialItem,
} from '../../components/historial/historialTypes'
import { filterPendingIngresos } from '../../utils/gastos/filterPendingIngresos'
import { getMonthFechaBounds } from '../../utils/date'
import {
  filterOptimisticGastos,
  filterPendingGastos,
  filterPendingNotInOptimistic,
} from '../../utils/gastos/optimisticGastos'

export function useHistorialQueries() {
  const { user } = useAuthSession()
  const { refreshKey } = useGastosRefreshState()
  const { optimisticGastos } = useOptimisticGastosState()
  const { pendingGastos, pendingIngresos } = useOfflineSyncStatus()
  const { filterOptions } = useCategorias(user?.id)
  const categoriaFilterOptions = useMemo(
    () => [...filterOptions, { value: 'Ingreso', label: 'Ingresos' }],
    [filterOptions],
  )
  const [ingresosItems, setIngresosItems] = useState<HistorialItem[]>([])
  const [selectedMonth, setSelectedMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  )
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todas')
  const [busqueda, setBusqueda] = useState('')
  const [syncedItems, setSyncedItems] = useState<HistorialItem[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const items = useMemo(() => {
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

    return [...optimistas, ...pendientes, ...pendientesIngresos, ...syncedItems, ...ingresosItems].sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
    )
  }, [syncedItems, optimisticGastos, pendingGastos, pendingIngresos, ingresosItems, selectedMonth, categoriaFiltro, busqueda])

  const handleLoadMore = useCallback(() => {
    if (!hasMore || cargandoMas) return
    setCargandoMas(true)
    setPage((current) => current + 1)
  }, [hasMore, cargandoMas])

  useEffect(() => {
    setPage(0)
    setSyncedItems([])
    setIngresosItems([])
  }, [selectedMonth, categoriaFiltro, busqueda, refreshKey])

  useEffect(() => {
    if (!user) return

    const userId = user.id
    let cancelled = false

    async function cargarHistorial() {
      const isFirstPage = page === 0
      if (isFirstPage) {
        setCargando(true)
      } else {
        setCargandoMas(true)
      }
      setError(null)

      const { inicio, fin } = getMonthFechaBounds(selectedMonth)
      const from = page * HISTORIAL_PAGE_SIZE
      const to = from + HISTORIAL_PAGE_SIZE - 1

      let query = supabase
        .from('gastos')
        .select('id, monto, categoria, descripcion, fecha, cuenta_id, es_msi, grupo_msi_id')
        .eq('user_id', userId)
        .gte('fecha', inicio)
        .lt('fecha', fin)
        .order('fecha', { ascending: false })
        .range(from, to)

      if (categoriaFiltro !== 'Todas' && categoriaFiltro !== 'Ingreso') {
        query = query.eq('categoria', categoriaFiltro)
      }

      if (busqueda.trim()) {
        query = query.ilike('descripcion', `%${busqueda.trim()}%`)
      }

      const gastosResult = await query

      let ingresos: HistorialItem[] = []
      if (page === 0 && categoriaFiltro !== 'Ingreso') {
        const ingresosResult = await listIngresosCuenta(userId, inicio, fin)
        if (!ingresosResult.error) {
          ingresos = (ingresosResult.data ?? [])
            .filter((ingreso) => {
              if (busqueda.trim()) {
                return ingreso.descripcion
                  .toLowerCase()
                  .includes(busqueda.trim().toLowerCase())
              }
              return true
            })
            .map((ingreso) => ({
              tipo: 'ingreso' as const,
              id: ingreso.id,
              monto: ingreso.monto,
              descripcion: ingreso.descripcion,
              fecha: ingreso.fecha,
              cuenta_id: ingreso.cuenta_id,
              categoria: 'Ingreso' as const,
            }))
        }
      }

      if (page === 0 && categoriaFiltro === 'Ingreso') {
        const ingresosResult = await listIngresosCuenta(userId, inicio, fin)
        ingresos = (ingresosResult.data ?? [])
          .filter((ingreso) => {
            if (busqueda.trim()) {
              return ingreso.descripcion.toLowerCase().includes(busqueda.trim().toLowerCase())
            }
            return true
          })
          .map((ingreso) => ({
            tipo: 'ingreso' as const,
            id: ingreso.id,
            monto: ingreso.monto,
            descripcion: ingreso.descripcion,
            fecha: ingreso.fecha,
            cuenta_id: ingreso.cuenta_id,
            categoria: 'Ingreso' as const,
          }))
      }

      if (page === 0) {
        setIngresosItems(categoriaFiltro === 'Todas' || categoriaFiltro === 'Ingreso' ? ingresos : [])
      }

      if (categoriaFiltro === 'Ingreso') {
        if (isFirstPage) setCargando(false)
        else setCargandoMas(false)
        setSyncedItems([])
        setHasMore(false)
        return
      }

      if (cancelled) return

      if (isFirstPage) {
        setCargando(false)
      } else {
        setCargandoMas(false)
      }

      if (gastosResult.error) {
        setError(gastosResult.error.message)
        return
      }

      const sincronizados = (gastosResult.data ?? []).map((gasto) => ({
        ...gasto,
        pendiente: false as const,
      }))

      setHasMore(sincronizados.length === HISTORIAL_PAGE_SIZE)

      if (page === 0) {
        setSyncedItems(sincronizados)
      } else {
        setSyncedItems((prev) => {
          const existentes = new Set(
            prev.flatMap((item) => (isHistorialSynced(item) ? [item.id] : [])),
          )
          const nuevos = sincronizados.filter((item) => !existentes.has(item.id))
          return [...prev, ...nuevos]
        })
      }
    }

    cargarHistorial()

    return () => {
      cancelled = true
    }
  }, [user, refreshKey, selectedMonth, categoriaFiltro, busqueda, page])

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
    error,
    cargando,
    cargandoMas,
    hasMore,
  }
}
