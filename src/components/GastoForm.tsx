import { type FormEvent, useState } from 'react'
import { useAuthContext, useGastosRefresh } from '../contexts'
import { notifyTelegram } from '../services/notifyTelegram'
import { addPendingGasto } from '../services/offlineQueue'
import { supabase } from '../services/supabase'
import { CATEGORIAS } from '../types/gasto'
import { showError, showSuccess, showWarning } from '../utils/toast'
import { validateDescripcion, validateMonto } from '../utils/validation'
import { cardClassName, inputClassName } from './formStyles'

const initialForm = {
  monto: '',
  categoria: CATEGORIAS[0],
  descripcion: '',
}

export default function GastoForm() {
  const { user } = useAuthContext()
  const { refresh } = useGastosRefresh()
  const [form, setForm] = useState(initialForm)
  const [guardando, setGuardando] = useState(false)

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

    if (!user) {
      showError('Debes iniciar sesión para guardar un gasto.')
      return
    }

    const monto = Number(form.monto)
    const descripcion = form.descripcion.trim()
    const payload = {
      monto,
      categoria: form.categoria,
      descripcion,
      fecha: new Date().toISOString(),
    }

    setGuardando(true)

    if (!navigator.onLine) {
      await addPendingGasto(payload)
      setGuardando(false)
      refresh()
      showWarning(
        'Sin conexión. Gasto guardado localmente y se sincronizará al volver internet.',
      )
      setForm(initialForm)
      return
    }

    const { error } = await supabase.from('gastos').insert({
      monto: payload.monto,
      categoria: payload.categoria,
      descripcion: payload.descripcion,
    })

    if (error) {
      setGuardando(false)
      showError(`Error al guardar el gasto: ${error.message}`)
      return
    }

    await notifyTelegram({
      monto,
      categoria: form.categoria,
      descripcion,
    })

    setGuardando(false)
    refresh()
    showSuccess('Gasto guardado correctamente.')
    setForm(initialForm)
  }

  return (
    <form onSubmit={handleSubmit} className={cardClassName}>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-white">Nuevo gasto</h2>
        <p className="text-sm text-slate-400">Registra un movimiento rápido</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="monto" className="block text-sm font-medium text-slate-300">
          Monto
        </label>
        <input
          id="monto"
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
        <label htmlFor="categoria" className="block text-sm font-medium text-slate-300">
          Categoría
        </label>
        <select
          id="categoria"
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
          {CATEGORIAS.map((categoria) => (
            <option key={categoria} value={categoria}>
              {categoria}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="descripcion" className="block text-sm font-medium text-slate-300">
          Descripción
        </label>
        <input
          id="descripcion"
          type="text"
          maxLength={200}
          placeholder="Ej. Supermercado, Uber, Netflix..."
          value={form.descripcion}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, descripcion: e.target.value }))
          }
          className={inputClassName}
          required
        />
      </div>

      <button
        type="submit"
        disabled={guardando}
        className="w-full rounded-xl bg-blue-500 px-4 py-3.5 text-base font-semibold text-white transition hover:bg-blue-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {guardando ? 'Guardando...' : 'Guardar Gasto'}
      </button>
    </form>
  )
}
