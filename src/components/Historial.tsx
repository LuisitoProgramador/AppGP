import { useEffect, useState, memo, useCallback } from 'react'
import { useAuthContext, useCuentas, useGastosData, useOfflineSync } from '../contexts'
import { addPendingGasto, removePendingGasto } from '../services/offlineQueue'
import { supabase } from '../services/supabase'
import {
  CATEGORIAS,
  HISTORIAL_PAGE_SIZE,
  type Gasto,
  type OptimisticGasto,
  type PendingGasto,
} from '../types/gasto'
import { formatCurrency } from '../utils/formatCurrency'
import { formatShortDate, getMonthFechaBounds } from '../utils/date'
import { filterOptimisticGastos, filterPendingNotInOptimistic } from '../utils/optimisticGastos'
import {
  buildGastoEliminadoSnapshot,
  montoSaldoAlRestaurar,
  type GastoEliminadoSnapshot,
} from '../utils/historialUndo'
import { showError, showInfo, showSuccessWithUndo } from '../utils/toast'
import { montoSaldoAlEliminarPendiente, saldoRevertAlEliminar } from '../utils/gastoSaldo'
import EditGastoModal, { type EditGastoModo } from './EditGastoModal'
import MonthSelector from './MonthSelector'
import Select from './Select'
import OfflineSyncStatus from './dashboard/OfflineSyncStatus'
import { EditIcon, SpinnerIcon, TrashIcon } from './icons'
import { cardClassName, iconButtonDangerClassName, iconButtonEditClassName, iconButtonMsiClassName, inputClassName, buttonSecondaryClassName } from './formStyles'

type HistorialItem =
  | (Gasto & { pendiente?: false; optimistic?: false })
  | (PendingGasto & { pendiente: true })
  | (OptimisticGasto & { optimistic: true })

interface HistorialItemRowProps {
  item: HistorialItem
  isBusy: boolean
  isOptimistic: boolean
  onEdit: (gasto: Gasto, modo: EditGastoModo) => void
  onDelete: (item: HistorialItem) => void
}

const HistorialItemRow = memo(function HistorialItemRow({
  item,
  isBusy,
  isOptimistic,
  onEdit,
  onDelete,
}: HistorialItemRowProps) {
  return (
    <div className="flex flex-col gap-2 bg-slate-900/40 px-3 py-3 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex min-w-0 flex-1 items-start justify-between gap-2 sm:items-center sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">
            {item.descripcion || item.categoria}
          </p>
          {(isOptimistic || item.pendiente) && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {isOptimistic && (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-300">
                  <SpinnerIcon />
                  Guardando...
                </span>
              )}
              {item.pendiente && (
                <span className="shrink-0 rounded-full bg-pulso-warning/20 px-2 py-0.5 text-xs text-pulso-warning">
                  Pendiente
                </span>
              )}
            </div>
          )}
          <p className="text-xs text-slate-400">
            {item.categoria} · {formatShortDate(item.fecha)}
          </p>
        </div>
        <p className="shrink-0 text-sm font-semibold text-slate-200 sm:hidden">
          {formatCurrency(Number(item.monto))}
        </p>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-1.5">
        <p className="hidden shrink-0 text-sm font-semibold text-slate-200 sm:block">
          {formatCurrency(Number(item.monto))}
        </p>
        {!item.pendiente && !isOptimistic && (
          <>
            <button
              type="button"
              onClick={() => onEdit(item as Gasto, 'cuota')}
              disabled={isBusy}
              aria-label="Editar gasto"
              title="Editar gasto"
              className={`${iconButtonEditClassName} max-sm:rounded-xl max-sm:border max-sm:border-blue-500/40 max-sm:bg-blue-500/15 max-sm:text-blue-200 max-sm:hover:bg-blue-500/25 sm:inline-flex sm:items-center sm:gap-1.5 sm:px-3 sm:py-2 sm:text-xs sm:font-semibold`}
            >
              <EditIcon />
              <span className="hidden sm:inline">Editar</span>
            </button>
            {item.es_msi && item.grupo_msi_id && (
              <button
                type="button"
                onClick={() => onEdit(item as Gasto, 'compra')}
                disabled={isBusy}
                aria-label="Editar compra MSI"
                title="Editar compra MSI"
                className={iconButtonMsiClassName}
              >
                MSI
              </button>
            )}
          </>
        )}
        {!isOptimistic && (
          <button
            type="button"
            onClick={() => onDelete(item)}
            disabled={isBusy}
            aria-label="Eliminar gasto"
            className={iconButtonDangerClassName}
          >
            <TrashIcon />
          </button>
        )}
      </div>
    </div>
  )
})

export default memo(function Historial() {
  const { user } = useAuthContext()
  const { refreshKey, refresh, optimisticGastos, removeOptimisticGastos, addOptimisticGasto } =
    useGastosData()
  const { pendingGastos, isSyncing, pendingCount } = useOfflineSync()
  const { revertGastoSaldo, applyGastoSaldo } = useCuentas()
  const [selectedMonth, setSelectedMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  )
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todas')
  const [busqueda, setBusqueda] = useState('')
  const [items, setItems] = useState<HistorialItem[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accionId, setAccionId] = useState<string | number | null>(null)
  const [gastoEditando, setGastoEditando] = useState<Gasto | null>(null)
  const [editModo, setEditModo] = useState<EditGastoModo>('cuota')

  function abrirEdicion(gastoItem: Gasto, modo: EditGastoModo) {
    setEditModo(modo)
    setGastoEditando(gastoItem)
  }

  const restaurarGastoEliminado = useCallback(
    async (snapshot: GastoEliminadoSnapshot) => {
      const { error } = await supabase.from('gastos').insert(snapshot.row)
      if (error) {
        showError(`No se pudo restaurar: ${error.message}`)
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
    [addOptimisticGasto, applyGastoSaldo, refresh],
  )

  useEffect(() => {
    setPage(0)
  }, [selectedMonth, categoriaFiltro, busqueda, refreshKey])

  useEffect(() => {
    if (!user) return

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
        .eq('user_id', user.id)
        .gte('fecha', inicio)
        .lt('fecha', fin)
        .order('fecha', { ascending: false })
        .range(from, to)

      if (categoriaFiltro !== 'Todas') {
        query = query.eq('categoria', categoriaFiltro)
      }

      if (busqueda.trim()) {
        query = query.ilike('descripcion', `%${busqueda.trim()}%`)
      }

      const gastosResult = await query

      if (isFirstPage) {
        setCargando(false)
      } else {
        setCargandoMas(false)
      }

      if (gastosResult.error) {
        setError(gastosResult.error.message)
        return
      }

      const sincronizados: HistorialItem[] = (gastosResult.data ?? []).map((gasto) => ({
        ...gasto,
        pendiente: false as const,
      }))

      setHasMore(sincronizados.length === HISTORIAL_PAGE_SIZE)

      if (page === 0) {
        const pendientes: HistorialItem[] = filterPendingNotInOptimistic(
          pendingGastos,
          optimisticGastos,
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

        const combinados = [...optimistas, ...pendientes, ...sincronizados].sort(
          (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
        )
        setItems(combinados)
      } else {
        setItems((prev) => {
          const existentes = new Set(
            prev.filter((item) => !item.pendiente).map((item) => item.id),
          )
          const nuevos = sincronizados.filter((item) => !existentes.has(item.id))
          return [...prev, ...nuevos]
        })
      }
    }

    cargarHistorial()
  }, [user, refreshKey, selectedMonth, categoriaFiltro, busqueda, page, optimisticGastos, pendingGastos])

  async function handleEliminar(item: HistorialItem) {
    if ('optimistic' in item && item.optimistic) return

    const etiqueta = item.descripcion || item.categoria
    const mensajeMsi =
      item.es_msi && item.grupo_msi_id
        ? `¿Eliminar solo esta cuota MSI de "${etiqueta}"? Las demás cuotas del plan no se borran.`
        : `¿Eliminar el gasto "${etiqueta}"?`
    if (!confirm(mensajeMsi)) return

    setAccionId(item.id)

    if (item.pendiente) {
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
    if (item.es_msi && item.grupo_msi_id) {
      const { data: grupoRows } = await supabase
        .from('gastos')
        .select('id, monto')
        .eq('grupo_msi_id', item.grupo_msi_id)
      if (grupoRows) {
        saldoRevert = saldoRevertAlEliminar(item, grupoRows)
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
  }

  return (
    <section className={cardClassName}>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-white">Historial</h2>
        <p className="text-sm text-slate-400">Busca, filtra y edita tus movimientos</p>
      </div>

      <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />

      <div className="grid gap-2 sm:grid-cols-2">
        <Select
          value={categoriaFiltro}
          onChange={setCategoriaFiltro}
          aria-label="Filtrar por categoría"
          options={[
            { value: 'Todas', label: 'Todas las categorías' },
            ...CATEGORIAS.map((categoria) => ({ value: categoria, label: categoria })),
          ]}
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
        <p className="text-center text-sm text-slate-400">
          No hay gastos que coincidan con los filtros.
        </p>
      )}

      {!cargando && items.length > 0 && (
        <div className="divide-y divide-slate-700/80 overflow-hidden rounded-xl border border-slate-700/60">
          {items.map((item) => {
            const itemKey =
              'optimistic' in item && item.optimistic
                ? `optimistic-${item.tempId}`
                : item.pendiente
                  ? `pending-${item.id}`
                  : `gasto-${item.id}`
            const isBusy =
              'optimistic' in item ? false : accionId === item.id
            const isOptimistic = 'optimistic' in item && item.optimistic

            return (
              <HistorialItemRow
                key={itemKey}
                item={item}
                isBusy={isBusy}
                isOptimistic={isOptimistic}
                onEdit={abrirEdicion}
                onDelete={handleEliminar}
              />
            )
          })}
        </div>
      )}

      {!cargando && hasMore && (
        <button
          type="button"
          onClick={() => setPage((current) => current + 1)}
          disabled={cargandoMas}
          className={`w-full ${buttonSecondaryClassName}`}
        >
          {cargandoMas ? 'Cargando...' : 'Cargar más'}
        </button>
      )}

      {gastoEditando && (
        <EditGastoModal
          gasto={gastoEditando}
          modoInicial={editModo}
          onClose={() => {
            setGastoEditando(null)
            setEditModo('cuota')
          }}
        />
      )}
    </section>
  )
})
