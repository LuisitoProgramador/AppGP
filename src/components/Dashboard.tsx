import { lazy, Suspense, type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useAuthContext, useGastosRefresh } from '../contexts'
import { getLimiteMensual, saveLimiteMensual } from '../services/presupuesto'
import {
  addAhorroToMeta,
  createMetaAhorro,
  listMetasAhorro,
} from '../services/metasAhorro'
import { supabase } from '../services/supabase'
import { COLORES_CATEGORIA } from '../types/gasto'
import type { MetaAhorro } from '../types/metaAhorro'
import { agruparPorCategoria } from '../utils/agruparPorCategoria'
import { formatCurrency } from '../utils/formatCurrency'
import {
  formatMonthLabel,
  getDaysRemainingInMonth,
  getMonthRange,
  isCurrentMonth,
} from '../utils/date'
import { mergeResumenWithOptimistic } from '../utils/optimisticGastos'
import { getMetaProgress } from '../utils/metaProgress'
import { showError, showSuccess, showWarning } from '../utils/toast'
import { validateMonto } from '../utils/validation'
import MonthSelector from './MonthSelector'
import { cardClassName, inputClassName } from './formStyles'

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
  const [metas, setMetas] = useState<MetaAhorro[]>([])
  const [metasCargando, setMetasCargando] = useState(true)
  const [metasError, setMetasError] = useState<string | null>(null)
  const [metasFromCache, setMetasFromCache] = useState(false)
  const [mostrarFormMeta, setMostrarFormMeta] = useState(false)
  const [metaNombre, setMetaNombre] = useState('')
  const [metaObjetivo, setMetaObjetivo] = useState('')
  const [guardandoMeta, setGuardandoMeta] = useState(false)
  const [ahorroInputs, setAhorroInputs] = useState<Record<number, string>>({})
  const [sumandoMetaId, setSumandoMetaId] = useState<number | null>(null)

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

  const cargarMetas = useCallback(async () => {
    if (!user) return

    setMetasCargando(true)
    setMetasError(null)

    const { data, error: listError, fromCache } = await listMetasAhorro(user.id)
    setMetasCargando(false)
    setMetasFromCache(fromCache)

    if (listError) {
      setMetasError(listError)
      return
    }

    setMetas(data)
  }, [user])

  useEffect(() => {
    cargarMetas()
  }, [cargarMetas, refreshKey])

  async function handleCrearMeta(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) return

    const objetivoError = validateMonto(metaObjetivo)
    if (objetivoError) {
      showError(objetivoError)
      return
    }

    const nombre = metaNombre.trim()
    if (!nombre) {
      showError('El nombre de la meta es obligatorio.')
      return
    }

    setGuardandoMeta(true)
    const { data, error: createError } = await createMetaAhorro(user.id, {
      nombre,
      monto_objetivo: Number(metaObjetivo),
    })
    setGuardandoMeta(false)

    if (createError) {
      showError(createError)
      return
    }

    if (data) {
      setMetas((current) => [...current, data])
    }

    setMetaNombre('')
    setMetaObjetivo('')
    setMostrarFormMeta(false)
    showSuccess('Meta de ahorro creada.')
  }

  async function handleSumarAhorro(meta: MetaAhorro) {
    if (!user) return

    const inputValue = ahorroInputs[meta.id] ?? ''
    const montoError = validateMonto(inputValue)
    if (montoError) {
      showError(montoError)
      return
    }

    const amount = Number(inputValue)
    setSumandoMetaId(meta.id)

    const previousMetas = metas
    setMetas((current) =>
      current.map((item) =>
        item.id === meta.id
          ? { ...item, monto_actual: item.monto_actual + amount }
          : item,
      ),
    )

    const { data, error: addError, offline } = await addAhorroToMeta(
      user.id,
      meta.id,
      amount,
      meta.monto_actual,
    )

    setSumandoMetaId(null)

    if (addError) {
      setMetas(previousMetas)
      showError(addError)
      return
    }

    if (data) {
      setMetas((current) =>
        current.map((item) => (item.id === meta.id ? data : item)),
      )
    }

    setAhorroInputs((current) => ({ ...current, [meta.id]: '' }))

    if (offline) {
      showWarning('Sin conexión. El ahorro se guardó localmente y se sincronizará al volver internet.')
      return
    }

    showSuccess(`Se sumaron ${formatCurrency(amount)} a "${meta.nombre}".`)
  }

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

      <div className="space-y-4 border-t border-slate-700/60 pt-5">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-slate-300">Metas de ahorro</h3>
          <p className="text-xs text-slate-500">
            Define un objetivo y suma ahorros de forma rápida
          </p>
        </div>

        {metasFromCache && metas.length > 0 && (
          <p className="text-xs text-amber-300">Mostrando metas guardadas localmente.</p>
        )}

        {metasError && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            Error al cargar metas: {metasError}
          </p>
        )}

        {metasCargando && (
          <p className="text-center text-sm text-slate-400">Cargando metas...</p>
        )}

        {!metasCargando && metas.length === 0 && !metasError && (
          <div className="space-y-3">
            <p className="text-center text-sm text-slate-400">
              Aún no tienes metas de ahorro.
            </p>
            {!mostrarFormMeta ? (
              <button
                type="button"
                onClick={() => setMostrarFormMeta(true)}
                className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400"
              >
                Crear meta
              </button>
            ) : (
              <form onSubmit={handleCrearMeta} className="space-y-3">
                <input
                  type="text"
                  value={metaNombre}
                  onChange={(e) => setMetaNombre(e.target.value)}
                  placeholder="Nombre (ej. Vacaciones)"
                  className={inputClassName}
                  maxLength={100}
                  required
                />
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={metaObjetivo}
                  onChange={(e) => setMetaObjetivo(e.target.value)}
                  placeholder="Monto objetivo"
                  className={inputClassName}
                  required
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMostrarFormMeta(false)}
                    className="flex-1 rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-600"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardandoMeta}
                    className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-60"
                  >
                    {guardandoMeta ? 'Guardando...' : 'Crear'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {!metasCargando && metas.length > 0 && (
          <div className="space-y-4">
            {metas.map((meta) => {
              const progress = getMetaProgress(meta)
              const isSumando = sumandoMetaId === meta.id

              return (
                <div
                  key={meta.id}
                  className="space-y-2 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{meta.nombre}</p>
                      <p className="text-xs text-slate-400">
                        {formatCurrency(meta.monto_actual)} de{' '}
                        {formatCurrency(meta.monto_objetivo)} ({progress.toFixed(0)}%)
                      </p>
                    </div>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-700/80">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={ahorroInputs[meta.id] ?? ''}
                      onChange={(e) =>
                        setAhorroInputs((current) => ({
                          ...current,
                          [meta.id]: e.target.value,
                        }))
                      }
                      placeholder="Sumar..."
                      className="min-w-0 flex-1 rounded-xl border border-slate-600 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                      aria-label={`Sumar ahorro a ${meta.nombre}`}
                    />
                    <button
                      type="button"
                      onClick={() => handleSumarAhorro(meta)}
                      disabled={isSumando}
                      className="shrink-0 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-60"
                    >
                      {isSumando ? '...' : 'Sumar'}
                    </button>
                  </div>
                </div>
              )
            })}

            {!mostrarFormMeta ? (
              <button
                type="button"
                onClick={() => setMostrarFormMeta(true)}
                className="w-full rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
              >
                + Añadir otra meta
              </button>
            ) : (
              <form onSubmit={handleCrearMeta} className="space-y-3 border-t border-slate-700/60 pt-4">
                <input
                  type="text"
                  value={metaNombre}
                  onChange={(e) => setMetaNombre(e.target.value)}
                  placeholder="Nombre de la nueva meta"
                  className={inputClassName}
                  maxLength={100}
                  required
                />
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={metaObjetivo}
                  onChange={(e) => setMetaObjetivo(e.target.value)}
                  placeholder="Monto objetivo"
                  className={inputClassName}
                  required
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMostrarFormMeta(false)}
                    className="flex-1 rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-600"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardandoMeta}
                    className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-60"
                  >
                    {guardandoMeta ? 'Guardando...' : 'Crear meta'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
