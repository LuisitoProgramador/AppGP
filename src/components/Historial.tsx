import { useEffect, useState } from 'react'
import { useAuthContext, useGastosRefresh } from '../contexts'
import { removePendingGasto, getPendingGastos } from '../services/offlineQueue'
import { supabase } from '../services/supabase'
import type { Gasto, PendingGasto } from '../types/gasto'
import { formatCurrency } from '../utils/formatCurrency'
import { formatShortDate } from '../utils/date'

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

export default function Historial() {
  const { user } = useAuthContext()
  const { refreshKey, refresh } = useGastosRefresh()
  const [items, setItems] = useState<HistorialItem[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [eliminandoId, setEliminandoId] = useState<string | number | null>(null)

  useEffect(() => {
    if (!user) return

    async function cargarHistorial() {
      setCargando(true)
      setError(null)

      const [gastosResult, pending] = await Promise.all([
        supabase
          .from('gastos')
          .select('id, monto, categoria, descripcion, fecha')
          .eq('user_id', user.id)
          .order('fecha', { ascending: false })
          .limit(50),
        getPendingGastos(),
      ])

      setCargando(false)

      if (gastosResult.error) {
        setError(gastosResult.error.message)
        return
      }

      const sincronizados: HistorialItem[] = (gastosResult.data ?? []).map((gasto) => ({
        ...gasto,
        pendiente: false as const,
      }))

      const pendientes: HistorialItem[] = pending.map((gasto) => ({
        ...gasto,
        pendiente: true as const,
      }))

      const combinados = [...pendientes, ...sincronizados].sort(
        (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
      )

      setItems(combinados)
    }

    cargarHistorial()
  }, [user, refreshKey])

  async function handleEliminar(item: HistorialItem) {
    const etiqueta = item.descripcion || item.categoria
    if (!confirm(`¿Eliminar el gasto "${etiqueta}"?`)) return

    setEliminandoId(item.pendiente ? item.id : item.id)

    if (item.pendiente) {
      await removePendingGasto(item.id)
      setEliminandoId(null)
      refresh()
      return
    }

    const { error: deleteError } = await supabase.from('gastos').delete().eq('id', item.id)

    setEliminandoId(null)

    if (deleteError) {
      alert(`Error al eliminar: ${deleteError.message}`)
      return
    }

    refresh()
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-700/80 bg-slate-800/60 p-5 shadow-xl shadow-black/20 backdrop-blur-sm">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-white">Historial</h2>
        <p className="text-sm text-slate-400">Últimos movimientos registrados</p>
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Error al cargar historial: {error}
        </p>
      )}

      {cargando && <p className="text-center text-sm text-slate-400">Cargando...</p>}

      {!cargando && !error && items.length === 0 && (
        <p className="text-center text-sm text-slate-400">No hay gastos en el historial.</p>
      )}

      {!cargando && items.length > 0 && (
        <div className="divide-y divide-slate-700/80 overflow-hidden rounded-xl border border-slate-700/60">
          {items.map((item) => {
            const itemKey = item.pendiente ? `pending-${item.id}` : `gasto-${item.id}`
            const isDeleting = eliminandoId === item.id

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
                <button
                  type="button"
                  onClick={() => handleEliminar(item)}
                  disabled={isDeleting}
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
    </section>
  )
}
