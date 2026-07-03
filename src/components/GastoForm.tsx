import { type FormEvent, useEffect, useRef, useState } from 'react'
import { useAuthContext, useGastosRefresh } from '../contexts'
import { getDefaultCuentaId } from '../services/cuentas'
import { notifyTelegram } from '../services/notifyTelegram'
import { addPendingGasto } from '../services/offlineQueue'
import { supabase } from '../services/supabase'
import { CATEGORIAS } from '../types/gasto'
import { parseGastoInput } from '../utils/parser'
import { formatCurrency } from '../utils/formatCurrency'
import { buildMsiGastos, buildSingleGasto } from '../utils/msi'
import { showError, showInfo, showSuccess, showWarning } from '../utils/toast'
import { validateDescripcion, validateMonto } from '../utils/validation'
import { cardClassName, inputClassName } from './formStyles'

const initialForm = {
  monto: '',
  categoria: CATEGORIAS[0],
  descripcion: '',
  cuentaId: '',
  esMsi: false,
  mesesMsi: '3',
}

export default function GastoForm() {
  const { user } = useAuthContext()
  const {
    refresh,
    addOptimisticGasto,
    removeOptimisticGastos,
    cuentas,
    cuentasLoading,
  } = useGastosRefresh()
  const [form, setForm] = useState(initialForm)
  const [guardando, setGuardando] = useState(false)
  const montoInputRef = useRef<HTMLInputElement>(null)

  const selectedCuenta = cuentas.find((c) => String(c.id) === form.cuentaId)
  const isCredito = selectedCuenta?.tipo === 'credito'

  useEffect(() => {
    if (cuentasLoading || cuentas.length === 0 || form.cuentaId) return
    const defaultId = getDefaultCuentaId(cuentas)
    if (defaultId) {
      setForm((prev) => ({ ...prev, cuentaId: String(defaultId) }))
    }
  }, [cuentas, cuentasLoading, form.cuentaId])

  useEffect(() => {
    if (!isCredito && form.esMsi) {
      setForm((prev) => ({ ...prev, esMsi: false }))
    }
  }, [isCredito, form.esMsi])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const query = params.get('q')
    if (query === null) return

    params.delete('q')
    const remaining = params.toString()
    const cleanUrl = remaining
      ? `${window.location.pathname}?${remaining}`
      : window.location.pathname
    window.history.replaceState({}, '', cleanUrl)

    if (query.trim()) {
      const parsed = parseGastoInput(query)
      if (parsed) {
        setForm((prev) => ({
          ...prev,
          monto: String(parsed.monto),
          categoria: parsed.categoria,
          descripcion: parsed.descripcion,
          esMsi: false,
        }))
        showInfo(
          `Gasto detectado: ${formatCurrency(parsed.monto)} en ${parsed.categoria}`,
        )
      }
    }

    montoInputRef.current?.focus()
  }, [])

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

    if (!form.cuentaId) {
      showError('Selecciona una cuenta o método de pago.')
      return
    }

    if (!user) {
      showError('Debes iniciar sesión para guardar un gasto.')
      return
    }

    const monto = Number(form.monto)
    const categoria = form.categoria
    const descripcion = form.descripcion.trim()
    const cuentaId = form.cuentaId
    const formBackup = { ...form }

    let rows = [buildSingleGasto({ monto, categoria, descripcion, cuentaId })]

    if (form.esMsi && isCredito) {
      const meses = Number(form.mesesMsi)
      if (!Number.isInteger(meses) || meses < 2 || meses > 48) {
        showError('Los meses sin intereses deben ser un número entre 2 y 48.')
        return
      }
      rows = buildMsiGastos({
        totalMonto: monto,
        months: meses,
        categoria,
        descripcion,
        cuentaId,
      })
    }

    const offlinePayload = form.esMsi && isCredito
      ? {
          monto,
          categoria,
          descripcion,
          fecha: rows[0].fecha,
          cuenta_id: cuentaId,
          es_msi: true,
          grupo_msi_id: rows[0].grupo_msi_id,
          msiInstallments: rows,
        }
      : {
          monto,
          categoria,
          descripcion,
          fecha: rows[0].fecha,
          cuenta_id: cuentaId,
          es_msi: false,
          grupo_msi_id: null,
        }

    if (!navigator.onLine) {
      setGuardando(true)
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
      await addPendingGasto({ ...offlinePayload, optimisticTempIds: tempIds })
      setGuardando(false)
      setForm({ ...initialForm, cuentaId: form.cuentaId })
      refresh()
      const msg =
        rows.length > 1
          ? `Sin conexión. Compra MSI (${rows.length} pagos) guardada localmente.`
          : 'Sin conexión. Gasto guardado localmente y se sincronizará al volver internet.'
      showWarning(msg)
      return
    }

    setForm({ ...initialForm, cuentaId: form.cuentaId })
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
    showInfo(rows.length > 1 ? `Guardando compra MSI (${rows.length} pagos)...` : 'Guardando gasto...')
    setGuardando(true)

    const { error } = await supabase.from('gastos').insert(rows)

    setGuardando(false)

    if (error) {
      removeOptimisticGastos(tempIds)
      setForm(formBackup)
      showError(`Error al guardar el gasto: ${error.message}`)
      return
    }

    removeOptimisticGastos(tempIds)
    await notifyTelegram({
      monto,
      categoria,
      descripcion:
        rows.length > 1 ? `${descripcion} (MSI x${rows.length})` : descripcion,
    })
    refresh()
    showSuccess(
      rows.length > 1
        ? `Compra MSI registrada: ${rows.length} mensualidades.`
        : 'Gasto guardado correctamente.',
    )
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
          ref={montoInputRef}
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
        <label htmlFor="cuenta" className="block text-sm font-medium text-slate-300">
          Cuenta de Pago
        </label>
        <select
          id="cuenta"
          value={form.cuentaId}
          onChange={(e) => setForm((prev) => ({ ...prev, cuentaId: e.target.value }))}
          className={inputClassName}
          required
          disabled={cuentasLoading || cuentas.length === 0}
        >
          {cuentasLoading && <option value="">Cargando cuentas...</option>}
          {!cuentasLoading && cuentas.length === 0 && (
            <option value="">Sin cuentas — añade una en Resumen</option>
          )}
          {cuentas.map((cuenta) => (
            <option key={cuenta.id} value={cuenta.id}>
              {cuenta.nombre}
              {cuenta.tipo === 'credito' ? ' (Crédito)' : ''}
            </option>
          ))}
        </select>
      </div>

      {isCredito && (
        <div className="space-y-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-4">
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span className="text-sm font-medium text-slate-300">
              ¿Es a Meses Sin Intereses?
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={form.esMsi}
              onClick={() => setForm((prev) => ({ ...prev, esMsi: !prev.esMsi }))}
              className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                form.esMsi ? 'bg-blue-500' : 'bg-slate-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  form.esMsi ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </label>

          {form.esMsi && (
            <div className="space-y-2">
              <label htmlFor="meses-msi" className="block text-sm font-medium text-slate-300">
                Cantidad de meses
              </label>
              <input
                id="meses-msi"
                type="number"
                inputMode="numeric"
                min="2"
                max="48"
                step="1"
                placeholder="3, 6, 12..."
                value={form.mesesMsi}
                onChange={(e) => setForm((prev) => ({ ...prev, mesesMsi: e.target.value }))}
                className={inputClassName}
                required
              />
              {form.monto && Number(form.mesesMsi) >= 2 && (
                <p className="text-xs text-slate-400">
                  {Number(form.mesesMsi)} pagos de{' '}
                  {formatCurrency(
                    Math.floor((Number(form.monto) / Number(form.mesesMsi)) * 100) / 100,
                  )}{' '}
                  aprox. por mes
                </p>
              )}
            </div>
          )}
        </div>
      )}

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
          {CATEGORIAS.map((item) => (
            <option key={item} value={item}>
              {item}
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
        disabled={guardando || cuentas.length === 0}
        className="w-full rounded-xl bg-blue-500 px-4 py-3.5 text-base font-semibold text-white transition hover:bg-blue-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {guardando ? 'Guardando...' : form.esMsi ? 'Registrar compra MSI' : 'Guardar Gasto'}
      </button>
    </form>
  )
}
