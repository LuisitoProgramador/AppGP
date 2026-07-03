import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { useAuthContext, useGastosRefresh } from '../contexts'
import {
  createGastoRecurrente,
  deleteGastoRecurrente,
  listGastosRecurrentes,
} from '../services/gastosRecurrentes'
import { CATEGORIAS, type GastoRecurrente } from '../types/gasto'
import { formatCurrency } from '../utils/formatCurrency'
import { showError, showSuccess } from '../utils/toast'
import { validateDescripcion, validateDiaMes, validateMonto } from '../utils/validation'
import { cardClassName, inputClassName } from './formStyles'

const initialForm = {
  descripcion: '',
  monto: '',
  categoria: CATEGORIAS[0],
  dia_mes: '1',
}

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

export default function GastosRecurrentes() {
  const { user } = useAuthContext()
  const { refreshKey, refresh } = useGastosRefresh()
  const [items, setItems] = useState<GastoRecurrente[]>([])
  const [form, setForm] = useState(initialForm)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [eliminandoId, setEliminandoId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const cargarRecurrentes = useCallback(async () => {
    if (!user) return

    setCargando(true)
    setError(null)

    const { data, error: listError } = await listGastosRecurrentes(user.id)
    setCargando(false)

    if (listError) {
      setError(listError)
      return
    }

    setItems(data)
  }, [user])

  useEffect(() => {
    cargarRecurrentes()
  }, [cargarRecurrentes, refreshKey])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const montoError = validateMonto(form.monto)
    if (montoError) {
      showError(montoError)
      return
    }

    const descripcionError = validateDescripcion(form.descripcion)
    if (descripcionError) {
      showError(descripcionError)
      return
    }

    const diaError = validateDiaMes(form.dia_mes)
    if (diaError) {
      showError(diaError)
      return
    }

    const diaMes = Number(form.dia_mes)

    if (!user) {
      showError('Debes iniciar sesión para guardar un gasto recurrente.')
      return
    }

    if (!navigator.onLine) {
      showError('Sin conexión. Conéctate a internet para gestionar gastos recurrentes.')
      return
    }

    setGuardando(true)

    const { error: createError } = await createGastoRecurrente({
      descripcion: form.descripcion.trim(),
      monto: Number(form.monto),
      categoria: form.categoria,
      dia_mes: diaMes,
    })

    setGuardando(false)

    if (createError) {
      showError(`Error al guardar: ${createError}`)
      return
    }

    setForm(initialForm)
    showSuccess('Gasto recurrente configurado.')
    refresh()
    cargarRecurrentes()
  }

  async function handleEliminar(item: GastoRecurrente) {
    if (!confirm(`¿Eliminar el gasto recurrente "${item.descripcion}"?`)) return

    if (!navigator.onLine) {
      showError('Sin conexión. Conéctate a internet para eliminar gastos recurrentes.')
      return
    }

    setEliminandoId(item.id)

    const { error: deleteError } = await deleteGastoRecurrente(item.id)
    setEliminandoId(null)

    if (deleteError) {
      showError(`Error al eliminar: ${deleteError}`)
      return
    }

    showSuccess('Gasto recurrente eliminado.')
    refresh()
    cargarRecurrentes()
  }

  return (
    <section className={cardClassName}>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-white">Gastos recurrentes</h2>
        <p className="text-sm text-slate-400">
          Suscripciones y pagos fijos que se registran solos cada mes
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Error al cargar: {error}
        </p>
      )}

      {cargando && <p className="text-center text-sm text-slate-400">Cargando...</p>}

      {!cargando && items.length > 0 && (
        <div className="divide-y divide-slate-700/80 overflow-hidden rounded-xl border border-slate-700/60">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 bg-slate-900/40 px-3 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{item.descripcion}</p>
                <p className="text-xs text-slate-400">
                  {item.categoria} · día {item.dia_mes} de cada mes
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-slate-200">
                {formatCurrency(Number(item.monto))}
              </p>
              <button
                type="button"
                onClick={() => handleEliminar(item)}
                disabled={eliminandoId === item.id}
                aria-label="Eliminar gasto recurrente"
                className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>
      )}

      {!cargando && items.length === 0 && !error && (
        <p className="text-center text-sm text-slate-400">
          No tienes gastos recurrentes configurados.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 border-t border-slate-700/60 pt-4">
        <h3 className="text-sm font-semibold text-slate-300">Añadir recurrente</h3>

        <div className="space-y-2">
          <label htmlFor="rec-descripcion" className="block text-sm font-medium text-slate-300">
            Descripción
          </label>
          <input
            id="rec-descripcion"
            type="text"
            maxLength={200}
            placeholder="Ej. Netflix, Internet..."
            value={form.descripcion}
            onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))}
            className={inputClassName}
            required
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="rec-monto" className="block text-sm font-medium text-slate-300">
              Monto
            </label>
            <input
              id="rec-monto"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.monto}
              onChange={(e) => setForm((prev) => ({ ...prev, monto: e.target.value }))}
              className={inputClassName}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="rec-dia" className="block text-sm font-medium text-slate-300">
              Día del mes
            </label>
            <input
              id="rec-dia"
              type="number"
              inputMode="numeric"
              min="1"
              max="31"
              value={form.dia_mes}
              onChange={(e) => setForm((prev) => ({ ...prev, dia_mes: e.target.value }))}
              className={inputClassName}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="rec-categoria" className="block text-sm font-medium text-slate-300">
            Categoría
          </label>
          <select
            id="rec-categoria"
            value={form.categoria}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                categoria: e.target.value as (typeof CATEGORIAS)[number],
              }))
            }
            className={inputClassName}
            required
          >
            {CATEGORIAS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={guardando}
          className="w-full rounded-xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {guardando ? 'Guardando...' : 'Añadir recurrente'}
        </button>
      </form>
    </section>
  )
}
