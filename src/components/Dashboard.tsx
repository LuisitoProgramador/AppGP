import { lazy, Suspense, type FormEvent, useEffect, useMemo, useState } from 'react'
import { useAuthContext, useGastosRefresh } from '../contexts'
import { getLimiteMensual, saveLimiteMensual } from '../services/presupuesto'
import { supabase } from '../services/supabase'
import { COLORES_CATEGORIA } from '../types/gasto'
import { agruparPorCategoria } from '../utils/agruparPorCategoria'
import { formatCurrency } from '../utils/formatCurrency'
import {
  formatMonthLabel,
  getDaysRemainingInMonth,
  getMonthRange,
  isCurrentMonth,
} from '../utils/date'
import { mergeResumenWithOptimistic } from '../utils/optimisticGastos'
import { showError, showSuccess } from '../utils/toast'
import { validateMonto } from '../utils/validation'
import MonthSelector from './MonthSelector'
import { cardClassName } from './formStyles'

const GastoChart = lazy(() => import('./GastoChart'))

interface ResumenMensual {
  categoria: string
  total: number
  cantidad: number
}

export default function Dashboard() {
  const { user } = useAuthContext()
  const { refreshKey, isSyncing, pendingCount, optimisticGastos } = useGastosRefresh()
  const [selectedMonth, setSelectedMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  )
  const [resumenMensual, setResumenMensual] = useState<ResumenMensual[]>([])
  const [limiteMensual, setLimiteMensual] = useState(10000)
  const [limiteInput, setLimiteInput] = useState('10000')
  const [guardandoLimite, setGuardandoLimite] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const mesLabel = useMemo(() => formatMonthLabel(selectedMonth), [selectedMonth])
  const esMesActual = useMemo(() => isCurrentMonth(selectedMonth), [selectedMonth])

  const resumen = useMemo(
    () =>
      agruparPorCategoria(
        mergeResumenWithOptimistic(resumenMensual, optimisticGastos, selectedMonth),
      ),
    [resumenMensual, optimisticGastos, selectedMonth],
  )

  const gastoTotal = useMemo(
    () => resumen.reduce((sum, item) => sum + item.total, 0),
    [resumen],
  )

  const diasRestantes = useMemo(
    () => (esMesActual ? getDaysRemainingInMonth(selectedMonth) : 0),
    [esMesActual, selectedMonth],
  )
  const disponible = limiteMensual - gastoTotal
  const presupuestoDiario = esMesActual && diasRestantes > 0 ? disponible / diasRestantes : 0

  useEffect(() => {
    if (!user) return

    async function cargarDashboard() {
      setCargando(true)
      setError(null)

      const { inicio, fin } = getMonthRange(selectedMonth)
      const limite = await getLimiteMensual(user.id)
      setLimiteMensual(limite)
      setLimiteInput(String(limite))

      const { data, error: queryError } = await supabase
        .from('gastos_resumen_mensual')
        .select('categoria, total, cantidad')
        .eq('user_id', user.id)
        .gte('mes', inicio.toISOString())
        .lt('mes', fin.toISOString())

      setCargando(false)

      if (queryError) {
        setError(queryError.message)
        return
      }

      setResumenMensual(
        (data ?? []).map((item) => ({
          categoria: item.categoria,
          total: Number(item.total),
          cantidad: Number(item.cantidad),
        })),
      )
    }

    cargarDashboard()
  }, [user, refreshKey, selectedMonth])

  async function handleGuardarLimite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) return

    const limiteError = validateMonto(limiteInput)
    if (limiteError) {
      showError(limiteError)
      return
    }

    const limite = Number(limiteInput)
    setGuardandoLimite(true)
    const { error: saveError } = await saveLimiteMensual(user.id, limite)
    setGuardandoLimite(false)

    if (saveError) {
      showError(`Error al guardar límite: ${saveError}`)
      return
    }

    setLimiteMensual(limite)
    showSuccess('Límite mensual guardado.')
  }

  return (
    <section className={cardClassName}>
      <div className="space-y-3">
        <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />
        <div className="space-y-1 text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-400">
            Gasto del mes
          </p>
          <p className="text-sm capitalize text-slate-500">{mesLabel}</p>
          {cargando ? (
            <p className="pt-2 text-4xl font-bold text-slate-500">...</p>
          ) : (
            <p className="pt-2 text-4xl font-bold text-white">
              {formatCurrency(gastoTotal)}
            </p>
          )}
        </div>
      </div>

      {esMesActual && !cargando && (
        <div
          className={`rounded-xl border px-4 py-3 text-center ${
            disponible >= 0
              ? 'border-emerald-500/30 bg-emerald-500/10'
              : 'border-red-500/30 bg-red-500/10'
          }`}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Presupuesto diario
          </p>
          <p
            className={`mt-1 text-2xl font-bold ${
              disponible >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {disponible >= 0
              ? `Puedes gastar ${formatCurrency(presupuestoDiario)} hoy`
              : `Excedido por ${formatCurrency(Math.abs(disponible))}`}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Límite {formatCurrency(limiteMensual)} · {diasRestantes} días restantes
          </p>
        </div>
      )}

      {esMesActual && (
        <form onSubmit={handleGuardarLimite} className="flex gap-2">
          <div className="min-w-0 flex-1">
            <label htmlFor="limite" className="sr-only">
              Límite mensual
            </label>
            <input
              id="limite"
              type="number"
              min="1"
              step="100"
              value={limiteInput}
              onChange={(e) => setLimiteInput(e.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-900/80 px-4 py-2.5 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
              placeholder="Límite mensual"
            />
          </div>
          <button
            type="submit"
            disabled={guardandoLimite}
            className="shrink-0 rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-600 disabled:opacity-60"
          >
            {guardandoLimite ? '...' : 'Guardar'}
          </button>
        </form>
      )}

      {(isSyncing || pendingCount > 0) && (
        <p className="text-center text-xs text-amber-300">
          {isSyncing
            ? 'Sincronizando gastos offline...'
            : `${pendingCount} gasto(s) pendiente(s) de sincronizar`}
        </p>
      )}

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Error al cargar gastos: {error}
        </p>
      )}

      {!cargando && !error && resumen.length === 0 && (
        <p className="text-center text-sm text-slate-400">
          No hay gastos registrados en este mes.
        </p>
      )}

      {!cargando && resumen.length > 0 && (
        <div className="space-y-4">
          <Suspense
            fallback={
              <p className="text-center text-sm text-slate-400">Cargando gráfica...</p>
            }
          >
            <GastoChart data={resumen} />
          </Suspense>
          <h3 className="text-sm font-semibold text-slate-300">Por categoría</h3>
          {resumen.map((item) => (
            <div key={item.categoria} className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-200">{item.categoria}</span>
                <span className="text-slate-400">
                  {formatCurrency(item.total)}{' '}
                  <span className="text-slate-500">
                    ({item.porcentaje.toFixed(0)}%)
                  </span>
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-700/80">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${COLORES_CATEGORIA[item.categoria] ?? 'bg-blue-500'}`}
                  style={{ width: `${item.porcentaje}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
