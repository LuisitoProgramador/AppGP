import { useEffect, useState, memo, useCallback, useMemo } from 'react'
import { useAuthSession, useCuentas, useGastosRefreshState, useOfflineSyncStatus, useOptimisticGastosState } from '../contexts'
import { useCategorias } from '../hooks/useCategorias'
import { listIngresosCuenta } from '../services/cuentas'
import { addPendingGasto, removePendingGasto, removePendingIngreso } from '../services/offlineQueue'
import { supabase } from '../services/supabase'
import { HISTORIAL_PAGE_SIZE, type Gasto, type PendingGasto } from '../types/gasto'
import { isHistorialIngreso, isHistorialPending, isHistorialPendingIngreso, isHistorialSynced, getHistorialAccionId, type HistorialItem } from './historial/historialTypes'
import { filterPendingIngresos } from '../utils/filterPendingIngresos'
import { showError, showInfo, showSuccess, showSuccessWithUndo } from '../utils/toast'
import { getMonthFechaBounds } from '../utils/date'
import { filterOptimisticGastos, filterPendingGastos, filterPendingNotInOptimistic } from '../utils/optimisticGastos'
import {
  buildGastoEliminadoSnapshot,
  montoSaldoAlRestaurar,
  type GastoEliminadoSnapshot,
} from '../utils/historialUndo'
import { navigateToTab } from '../utils/welcomeBack'
import { montoSaldoAlEliminarPendiente, saldoRevertAlEliminar } from '../utils/gastoSaldo'
import { parseMsiDescripcion } from '../utils/msi'
import EditGastoModal, { type EditGastoModo } from './EditGastoModal'
import MonthSelector from './MonthSelector'
import Select from './Select'
import OfflineSyncStatus from './dashboard/OfflineSyncStatus'
import HistorialVirtualList from './historial/HistorialVirtualList'
import {
  cardClassName,
  inputClassName,
  buttonSecondaryClassName,
} from './formStyles'

export default memo(function Historial() {
  const { user } = useAuthSession()
  const { refreshKey, refresh } = useGastosRefreshState()
  const { optimisticGastos, removeOptimisticGastos, addOptimisticGasto } =
    useOptimisticGastosState()
  const { pendingGastos, pendingIngresos, isSyncing, pendingCount } = useOfflineSyncStatus()
  const { revertGastoSaldo, applyGastoSaldo } = useCuentas()
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
  const [accionId, setAccionId] = useState<string | number | null>(null)
  const [gastoEditando, setGastoEditando] = useState<Gasto | null>(null)
  const [editModo, setEditModo] = useState<EditGastoModo>('cuota')

  const abrirEdicion = useCallback((gastoItem: Gasto, modo: EditGastoModo) => {
    setEditModo(modo)
    setGastoEditando(gastoItem)
  }, [])

  const handleCloseEdit = useCallback(() => {
    setGastoEditando(null)
    setEditModo('cuota')
  }, [])

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

  const restaurarGastoEliminado = useCallback(
    async (snapshot: GastoEliminadoSnapshot) => {
      const { error: insertError } = await supabase.from('gastos').insert(snapshot.row)
      if (insertError) {
        showError(`No se pudo restaurar: ${insertError.message}`)
        return
      }

      const cuentaId = snapshot.saldoAplicado?.cuentaId ?? snapshot.row.cuenta_id
      if (cuentaId && snapshot.saldoAplicado) {
        const montoSaldo = montoSaldoAlRestaurar(snapshot)
        const { error: saldoError } = await applyGastoSaldo(cuentaId, montoSaldo)
        if (saldoError) {
          showError(`Gasto restaurado, pero el saldo no se actualizó: ${saldoError}`)
          refresh()
          return
        }
      }

      refresh()
      showInfo('Gasto restaurado.')
    },
    [applyGastoSaldo, refresh],
  )

  const restaurarGastoPendiente = useCallback(
    async (pending: PendingGasto) => {
      if (!user) return

      const rows =
        pending.msiInstallments ??
        [
          {
            monto: pending.monto,
            categoria: pending.categoria,
            descripcion: pending.descripcion,
            fecha: pending.fecha,
            cuenta_id: pending.cuenta_id ?? null,
            es_msi: pending.es_msi ?? false,
            grupo_msi_id: pending.grupo_msi_id ?? null,
          },
        ]

      const tempIds = rows.map((row) =>
        addOptimisticGasto({
          monto: row.monto,
          categoria: row.categoria,
          descripcion: row.descripcion,
          fecha: row.fecha,
          cuenta_id: row.cuenta_id,
          es_msi: row.es_msi,
          grupo_msi_id: row.grupo_msi_id,
        }),
      )

      await addPendingGasto({
        userId: user.id,
        monto: pending.monto,
        categoria: pending.categoria,
        descripcion: pending.descripcion,
        fecha: pending.fecha,
        cuenta_id: pending.cuenta_id,
        es_msi: pending.es_msi,
        grupo_msi_id: pending.grupo_msi_id,
        msiInstallments: pending.msiInstallments,
        optimisticTempIds: tempIds,
      })

      if (pending.cuenta_id) {
        const montoSaldo = montoSaldoAlEliminarPendiente(pending)
        const { error: saldoError } = await applyGastoSaldo(pending.cuenta_id, montoSaldo)
        if (saldoError) {
          showError(`Gasto restaurado, pero el saldo no se actualizó: ${saldoError}`)
        }
      }

      refresh()
      showInfo('Gasto restaurado.')
    },
    [addOptimisticGasto, applyGastoSaldo, refresh, user],
  )

  const handleEliminar = useCallback(
    async (item: HistorialItem) => {
      if ('optimistic' in item && item.optimistic) return

      const etiqueta = item.descripcion || item.categoria
      const mensajeMsi =
        item.es_msi && item.grupo_msi_id
          ? `¿Eliminar solo esta cuota MSI de "${etiqueta}"? Las demás cuotas del plan no se borran.`
          : `¿Eliminar el gasto "${etiqueta}"?`
      if (!confirm(mensajeMsi)) return

      setAccionId(getHistorialAccionId(item) ?? null)

      if (isHistorialPendingIngreso(item)) {
        const { error: saldoError } = await applyGastoSaldo(item.cuenta_id, item.monto)
        if (saldoError) {
          setAccionId(null)
          showError(`No se pudo revertir el saldo: ${saldoError}`)
          return
        }
        await removePendingIngreso(item.id)
        setAccionId(null)
        refresh()
        showSuccess('Ingreso pendiente eliminado.')
        return
      }

      if (isHistorialPending(item)) {
        const pendingBackup = { ...item }
        if (item.cuenta_id) {
          const montoRevert = montoSaldoAlEliminarPendiente(item)
          const { error: saldoError } = await revertGastoSaldo(item.cuenta_id, montoRevert)
          if (saldoError) {
            setAccionId(null)
            showError(`No se pudo revertir el saldo: ${saldoError}`)
            return
          }
        }
        if (item.optimisticTempIds?.length) {
          removeOptimisticGastos(item.optimisticTempIds)
        }
        await removePendingGasto(item.id)
        setAccionId(null)
        refresh()
        const esMsi = Boolean(pendingBackup.msiInstallments?.length)
        showSuccessWithUndo(
          esMsi ? 'Compra MSI pendiente eliminada.' : 'Gasto pendiente eliminado.',
          () => restaurarGastoPendiente(pendingBackup),
        )
        return
      }

      let saldoRevert = saldoRevertAlEliminar(item, [{ id: item.id, monto: item.monto }])
      if (item.es_msi && user) {
        if (item.grupo_msi_id) {
          const { data: grupoRows } = await supabase
            .from('gastos')
            .select('id, monto')
            .eq('grupo_msi_id', item.grupo_msi_id)
          if (grupoRows) {
            saldoRevert = saldoRevertAlEliminar(item, grupoRows)
          }
        } else if (item.cuenta_id) {
          const parsed = item.descripcion ? parseMsiDescripcion(item.descripcion) : null
          let legacyQuery = supabase
            .from('gastos')
            .select('id, monto')
            .eq('user_id', user.id)
            .eq('es_msi', true)
            .eq('cuenta_id', item.cuenta_id)

          legacyQuery = parsed
            ? legacyQuery.ilike('descripcion', `${parsed.base} (MSI %`)
            : legacyQuery.eq('descripcion', item.descripcion ?? '')

          const { data: legacyRows } = await legacyQuery
          if (legacyRows?.length) {
            saldoRevert = saldoRevertAlEliminar(item, legacyRows)
          }
        }
      }

      const snapshot = buildGastoEliminadoSnapshot(item, saldoRevert)

      const { error: deleteError } = await supabase.from('gastos').delete().eq('id', item.id)

      setAccionId(null)

      if (deleteError) {
        showError(`Error al eliminar: ${deleteError.message}`)
        return
      }

      if (saldoRevert) {
        const { error: saldoError } = await revertGastoSaldo(
          saldoRevert.cuentaId,
          saldoRevert.monto,
        )
        if (saldoError) {
          showError(`Gasto eliminado, pero el saldo no se actualizó: ${saldoError}`)
          refresh()
          return
        }
      }

      refresh()
      showSuccessWithUndo(
        item.es_msi ? 'Cuota MSI eliminada.' : 'Gasto eliminado.',
        () => restaurarGastoEliminado(snapshot),
      )
    },
    [refresh, removeOptimisticGastos, restaurarGastoEliminado, restaurarGastoPendiente, revertGastoSaldo, user],
  )

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

  return (
    <section className={cardClassName}>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-white">Historial</h2>
        <p className="text-sm text-slate-400">Gastos e ingresos del mes</p>
      </div>

      <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />

      <div className="grid gap-2 sm:grid-cols-2">
        <Select
          value={categoriaFiltro}
          onChange={setCategoriaFiltro}
          aria-label="Filtrar por categoría"
          options={categoriaFilterOptions}
        />
        <input
          type="search"
          inputMode="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar descripción..."
          className={inputClassName}
          aria-label="Buscar por descripción"
        />
      </div>

      <OfflineSyncStatus isSyncing={isSyncing} pendingCount={pendingCount} />

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Error al cargar historial: {error}
        </p>
      )}

      {cargando && <p className="text-center text-sm text-slate-400">Cargando...</p>}

      {!cargando && !error && items.length === 0 && (
        <div className="space-y-3 text-center">
          <p className="text-sm text-slate-400">
            {busqueda.trim() || categoriaFiltro !== 'Todas'
              ? 'No hay movimientos que coincidan con los filtros.'
              : 'Aún no hay movimientos este mes.'}
          </p>
          {!busqueda.trim() && categoriaFiltro === 'Todas' && (
            <button
              type="button"
              onClick={() => navigateToTab('registro')}
              className={buttonSecondaryClassName}
            >
              Registrar primer gasto
            </button>
          )}
        </div>
      )}

      {!cargando && items.length > 0 && (
        <HistorialVirtualList
          items={items}
          accionId={accionId}
          hasMore={hasMore}
          cargandoMas={cargandoMas}
          onLoadMore={handleLoadMore}
          onEdit={abrirEdicion}
          onDelete={handleEliminar}
        />
      )}

      {!cargando && hasMore && cargandoMas && (
        <button type="button" disabled className={`w-full ${buttonSecondaryClassName}`}>
          Cargando...
        </button>
      )}

      {gastoEditando && (
        <EditGastoModal
          gasto={gastoEditando}
          modoInicial={editModo}
          onClose={handleCloseEdit}
        />
      )}
    </section>
  )
})
