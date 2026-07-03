import { useEffect, useState } from 'react'
import { useAuthContext, useGastosRefresh } from '../contexts'
import { removePendingGasto, getPendingGastos } from '../services/offlineQueue'
import { supabase } from '../services/supabase'
import {
  CATEGORIAS,
  HISTORIAL_PAGE_SIZE,
  type Gasto,
  type PendingGasto,
} from '../types/gasto'
import { formatCurrency } from '../utils/formatCurrency'
import { formatShortDate, getMonthRange } from '../utils/date'
import { showError, showSuccess } from '../utils/toast'
import EditGastoModal from './EditGastoModal'
import MonthSelector from './MonthSelector'
import { cardClassName, inputClassName } from './formStyles'

type HistorialItem =
  | (Gasto & { pendiente?: false })
  | (PendingGasto & { pendiente: true })

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

export default function Historial() {
  const { user } = useAuthContext()
  const { refreshKey, refresh } = useGastosRefresh()
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

      const { inicio, fin } = getMonthRange(selectedMonth)
      const from = page * HISTORIAL_PAGE_SIZE
      const to = from + HISTORIAL_PAGE_SIZE - 1

      let query = supabase
        .from('gastos')
        .select('id, monto, categoria, descripcion, fecha')
        .eq('user_id', user.id)
        .gte('fecha', inicio.toISOString())
        .lt('fecha', fin.toISOString())
        .order('fecha', { ascending: false })
        .range(from, to)

      if (categoriaFiltro !== 'Todas') {
        query = query.eq('categoria', categoriaFiltro)
      }

      if (busqueda.trim()) {
        query = query.ilike('descripcion', `%${busqueda.trim()}%`)
      }

      const [gastosResult, pending] = await Promise.all([
        query,
        page === 0 ? getPendingGastos() : Promise.resolve([]),
      ])

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
        const pendientes: HistorialItem[] = pending.map((gasto) => ({
          ...gasto,
          pendiente: true as const,
        }))

        const combinados = [...pendientes, ...sincronizados].sort(
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
  }, [user, refreshKey, selectedMonth, categoriaFiltro, busqueda, page])

  async function handleEliminar(item: HistorialItem) {
    const etiqueta = item.descripcion || item.categoria
    if (!confirm(`¿Eliminar el gasto "${etiqueta}"?`)) return

    setAccionId(item.id)

    if (item.pendiente) {
      await removePendingGasto(item.id)
      setAccionId(null)
      refresh()
      showSuccess('Gasto pendiente eliminado.')
      return
    }

    const { error: deleteError } = await supabase.from('gastos').delete().eq('id', item.id)

    setAccionId(null)

    if (deleteError) {
      showError(`Error al eliminar: ${deleteError.message}`)
      return
    }

    refresh()
    showSuccess('Gasto eliminado.')
  }

  return (
    <section className={cardClassName}>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-white">Historial</h2>
        <p className="text-sm text-slate-400">Busca, filtra y edita tus movimientos</p>
      </div>

      <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />

      <div className="grid gap-2 sm:grid-cols-2">
        <select
          value={categoriaFiltro}
          onChange={(e) => setCategoriaFiltro(e.target.value)}
          className={inputClassName}
          aria-label="Filtrar por categoría"
        >
          <option value="Todas">Todas las categorías</option>
          {CATEGORIAS.map((categoria) => (
            <option key={categoria} value={categoria}>
              {categoria}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar descripción..."
          className={inputClassName}
          aria-label="Buscar por descripción"
        />
      </div>

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
            const itemKey = item.pendiente ? `pending-${item.id}` : `gasto-${item.id}`
            const isBusy = accionId === item.id

            return (
              <div
                key={itemKey}
                className="flex items-center gap-3 bg-slate-900/40 px-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-white">
                      {item.descripcion || item.categoria}
                    </p>
                    {item.pendiente && (
                      <span className="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">
                        Pendiente
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    {item.categoria} · {formatShortDate(item.fecha)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-slate-200">
                  {formatCurrency(Number(item.monto))}
                </p>
                {!item.pendiente && (
                  <button
                    type="button"
                    onClick={() => setGastoEditando(item)}
                    disabled={isBusy}
                    aria-label="Editar gasto"
                    className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-blue-500/10 hover:text-blue-400 disabled:opacity-50"
                  >
                    <EditIcon />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleEliminar(item)}
                  disabled={isBusy}
                  aria-label="Eliminar gasto"
                  className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                >
                  <TrashIcon />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {!cargando && hasMore && (
        <button
          type="button"
          onClick={() => setPage((current) => current + 1)}
          disabled={cargandoMas}
          className="w-full rounded-xl bg-slate-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-600 disabled:opacity-60"
        >
          {cargandoMas ? 'Cargando...' : 'Cargar más'}
        </button>
      )}

      {gastoEditando && (
        <EditGastoModal gasto={gastoEditando} onClose={() => setGastoEditando(null)} />
      )}
    </section>
  )
}
