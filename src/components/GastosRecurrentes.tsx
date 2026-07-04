import { type FormEvent, useEffect, useMemo, useState, memo } from 'react'
import { useAuthSession, useCuentas, useGastosRefreshState, useRecurrentes } from '../contexts'
import {
  createGastoRecurrente,
  deleteGastoRecurrente,
  updateGastoRecurrente,
} from '../services/gastosRecurrentes'
import { getDefaultCuentaId } from '../services/cuentas'
import { useCategorias } from '../hooks/useCategorias'
import { categoriaPadre, parseCategoriaParts } from '../services/subcategorias'
import { type GastoRecurrente, type Categoria } from '../types/gasto'
import { formatCurrency } from '../utils/formatCurrency'
import { parseMontoValue } from '../utils/montoInput'
import { isOnline } from '../utils/network'
import { showError, showSuccess } from '../utils/toast'
import { validateDescripcion, validateDiaMes, validateMonto } from '../utils/validation'
import { cardClassName, formSubmitStickyClassName, formWithKeyboardClassName, iconButtonDangerClassName, iconButtonEditClassName, inputClassName, buttonPrimaryClassName, buttonGhostClassName } from './formStyles'
import { EditIcon, TrashIcon } from './icons'
import Select from './Select'
import MontoInput from './MontoInput'

const initialForm: {
  descripcion: string
  monto: string
  categoria: Categoria
  dia_mes: string
  cuentaId: string
} = {
  descripcion: '',
  monto: '',
  categoria: 'Otros',
  dia_mes: '1',
  cuentaId: '',
}

function cuentaLabel(cuentas: { id: string; nombre: string }[], cuentaId: string | null): string {
  if (!cuentaId) return 'Cuenta predeterminada'
  return cuentas.find((c) => c.id === cuentaId)?.nombre ?? 'Cuenta asignada'
}

export default memo(function GastosRecurrentes() {
  const { user } = useAuthSession()
  const { cuentas, cuentasLoading } = useCuentas()
  const { refresh } = useGastosRefreshState()
  const { recurrentes: items, cargando, error } = useRecurrentes()
  const { categorias, selectOptions: categoriaOptions } = useCategorias(user?.id)
  const [form, setForm] = useState(initialForm)
  const [guardando, setGuardando] = useState(false)
  const [eliminandoId, setEliminandoId] = useState<number | null>(null)
  const [editandoId, setEditandoId] = useState<number | null>(null)

  useEffect(() => {
    if (form.cuentaId || cuentas.length === 0) return
    const defaultId = getDefaultCuentaId(cuentas)
    if (defaultId) {
      setForm((prev) => ({ ...prev, cuentaId: defaultId }))
    }
  }, [cuentas, form.cuentaId])

  useEffect(() => {
    const padre = categoriaPadre(form.categoria)
    if (padre && categorias.includes(padre)) return
    if (categorias.length > 0) {
      setForm((prev) => ({ ...prev, categoria: categorias.includes(prev.categoria) ? prev.categoria : 'Otros' }))
    }
  }, [categorias, form.categoria])

  const cuentasDisponibles = useMemo(() => cuentas, [cuentas])

  function iniciarEdicion(item: GastoRecurrente) {
    const { padre } = parseCategoriaParts(item.categoria)
    setEditandoId(item.id)
    setForm({
      descripcion: item.descripcion,
      monto: String(item.monto),
      categoria: categorias.includes(padre) ? padre : 'Otros',
      dia_mes: String(item.dia_mes),
      cuentaId: item.cuenta_id ?? '',
    })
  }

  function cancelarEdicion() {
    setEditandoId(null)
    setForm((prev) => ({
      ...initialForm,
      cuentaId: prev.cuentaId || getDefaultCuentaId(cuentas) || '',
      categoria: categorias.includes(prev.categoria) ? prev.categoria : 'Otros',
    }))
  }

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

    if (!form.cuentaId) {
      showError('Selecciona la cuenta desde la que se cobrará este pago.')
      return
    }

    const diaMes = Number(form.dia_mes)

    if (!user) {
      showError('Debes iniciar sesión para guardar un gasto recurrente.')
      return
    }

    if (!isOnline()) {
      showError('Sin conexión. Conéctate a internet para gestionar gastos recurrentes.')
      return
    }

    const categoria = form.categoria
    setGuardando(true)

    if (editandoId != null) {
      const { error: updateError } = await updateGastoRecurrente(editandoId, {
        descripcion: form.descripcion.trim(),
        monto: parseMontoValue(form.monto),
        categoria,
        dia_mes: diaMes,
        cuenta_id: form.cuentaId,
      })
      setGuardando(false)

      if (updateError) {
        showError(`Error al actualizar: ${updateError}`)
        return
      }

      cancelarEdicion()
      showSuccess('Gasto recurrente actualizado.')
      refresh()
      return
    }

    const { error: createError } = await createGastoRecurrente({
      descripcion: form.descripcion.trim(),
      monto: parseMontoValue(form.monto),
      categoria,
      dia_mes: diaMes,
      cuenta_id: form.cuentaId,
    })

    setGuardando(false)

    if (createError) {
      showError(`Error al guardar: ${createError}`)
      return
    }

    setForm((prev) => ({
      ...initialForm,
      cuentaId: prev.cuentaId,
      categoria: prev.categoria,
    }))
    showSuccess('Gasto recurrente configurado.')
    refresh()
  }

  async function handleEliminar(item: GastoRecurrente) {
    if (!confirm(`¿Eliminar el gasto recurrente "${item.descripcion}"?`)) return

    if (!isOnline()) {
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
  }

  return (
    <section className={cardClassName}>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-white">Gastos recurrentes</h2>
        <p className="text-sm text-slate-400">
          Pagos fijos que se registran automáticamente cada mes
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          No se pudieron cargar los gastos recurrentes: {error}
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
                <p className="truncate text-xs text-slate-400">
                  {item.categoria} · día {item.dia_mes} · {cuentaLabel(cuentas, item.cuenta_id)}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-slate-200">
                {formatCurrency(Number(item.monto))}
              </p>
              <button
                type="button"
                onClick={() => iniciarEdicion(item)}
                aria-label="Editar gasto recurrente"
                className={iconButtonEditClassName}
              >
                <EditIcon />
              </button>
              <button
                type="button"
                onClick={() => handleEliminar(item)}
                disabled={eliminandoId === item.id}
                aria-label="Eliminar gasto recurrente"
                className={iconButtonDangerClassName}
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>
      )}

      {!cargando && items.length === 0 && !error && (
        <p className="text-center text-sm text-slate-400">
          No hay gastos recurrentes configurados.
        </p>
      )}

      <form onSubmit={handleSubmit} className={`space-y-4 border-t border-slate-700/60 pt-4 ${formWithKeyboardClassName}`}>
        <h3 className="text-sm font-semibold text-slate-300">
          {editandoId != null ? 'Editar gasto recurrente' : 'Nuevo gasto recurrente'}
        </h3>

        <div className="space-y-2">
          <label htmlFor="rec-descripcion" className="block text-sm font-medium text-slate-300">
            Descripción
          </label>
          <input
            id="rec-descripcion"
            type="text"
            inputMode="text"
            maxLength={200}
            placeholder="Ej. Suscripción, renta, seguro"
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
            <MontoInput
              id="rec-monto"
              value={form.monto}
              onChange={(value) => setForm((prev) => ({ ...prev, monto: value }))}
              placeholder="0"
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
          <Select
            id="rec-categoria"
            value={form.categoria}
            onChange={(categoria) =>
              setForm((prev) => ({
                ...prev,
                categoria: categoria as Categoria,
              }))
            }
            options={categoriaOptions}
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="rec-cuenta" className="block text-sm font-medium text-slate-300">
            Cuenta de pago
          </label>
          <Select
            id="rec-cuenta"
            value={form.cuentaId}
            onChange={(cuentaId) => setForm((prev) => ({ ...prev, cuentaId }))}
            options={[
              ...(cuentasLoading
                ? [{ value: '', label: 'Cargando cuentas...', disabled: true }]
                : []),
              ...(!cuentasLoading && cuentasDisponibles.length === 0
                ? [{ value: '', label: 'No hay cuentas configuradas', disabled: true }]
                : []),
              ...cuentasDisponibles.map((cuenta) => ({
                value: String(cuenta.id),
                label: `${cuenta.nombre}${cuenta.tipo === 'credito' ? ' (Crédito)' : ''}`,
              })),
            ]}
            disabled={cuentasLoading || cuentasDisponibles.length === 0}
            required
          />
          {!cuentasLoading && cuentasDisponibles.length === 0 && (
            <p className="text-xs text-slate-500">
              No hay cuentas configuradas. Añade una para comenzar.
            </p>
          )}
        </div>

        <div className={formSubmitStickyClassName}>
          {editandoId != null && (
            <button
              type="button"
              onClick={cancelarEdicion}
              className={`mb-2 w-full ${buttonGhostClassName}`}
            >
              Cancelar edición
            </button>
          )}
          <button
            type="submit"
            disabled={guardando || cuentasDisponibles.length === 0}
            className={buttonPrimaryClassName}
          >
            {guardando
              ? 'Guardando...'
              : editandoId != null
                ? 'Guardar cambios'
                : 'Guardar gasto recurrente'}
          </button>
        </div>
      </form>
    </section>
  )
})
