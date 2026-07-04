import { type FormEvent, useEffect, useRef, useState, memo } from 'react'
import { useAuthSession, useCuentas, useGastosRefreshState, useOptimisticGastosState } from '../contexts'
import { useCategorias } from '../hooks/useCategorias'
import { getDefaultCuentaId } from '../services/cuentas'
import { addPendingGasto, removePendingGasto } from '../services/offlineQueue'
import { recordUltimoRegistro } from '../services/registroPrefs'
import { supabase } from '../services/supabase'
import { type Categoria } from '../types/gasto'
import { formatCurrency } from '../utils/formatCurrency'
import { parseMontoValue } from '../utils/montoInput'
import { buildMsiGastos, buildSingleGasto } from '../utils/msi'
import { montoParaSaldoCuenta } from '../utils/cuentaSaldo'
import { getDayFechaBounds } from '../utils/date'
import { findDuplicadoHoy, isToday } from '../utils/duplicateGasto'
import { markAppVisit } from '../utils/welcomeBack'
import { isOnline } from '../utils/network'
import { showError, showInfo, showSuccessWithUndo, showWarning } from '../utils/toast'
import { validateCuentaId, validateDescripcion, validateMonto, validateMsiMeses } from '../utils/validation'
import {
  buttonPrimaryClassName,
  cardClassName,
  chipPickerClassName,
  formSubmitStickyClassName,
  inputClassName,
  registroFormClassName,
} from './formStyles'
import MontoInput from './MontoInput'

const initialForm: {
  monto: string
  categoria: Categoria
  descripcion: string
  cuentaId: string
  esMsi: boolean
  mesesMsi: string
} = {
  monto: '',
  categoria: 'Otros',
  descripcion: '',
  cuentaId: '',
  esMsi: false,
  mesesMsi: '3',
}

type FormState = typeof initialForm

export default memo(function GastoForm() {
  const { user } = useAuthSession()
  const { refresh } = useGastosRefreshState()
  const { addOptimisticGasto, removeOptimisticGastos, optimisticGastos } =
    useOptimisticGastosState()
  const { cuentas, cuentasLoading, applyGastoSaldo, revertGastoSaldo } = useCuentas()
  const { categorias } = useCategorias(user?.id)
  const [form, setForm] = useState(initialForm)
  const [guardando, setGuardando] = useState(false)
  const montoInputRef = useRef<HTMLInputElement>(null)

  const selectedCuenta = cuentas.find((c) => String(c.id) === form.cuentaId)
  const isCredito = selectedCuenta?.tipo === 'credito'

  useEffect(() => {
    if (cuentasLoading || cuentas.length === 0 || form.cuentaId) return
    if (cuentas.length === 1) {
      const id = getDefaultCuentaId(cuentas)
      if (id) setForm((prev) => ({ ...prev, cuentaId: String(id) }))
    }
  }, [cuentas, cuentasLoading, form.cuentaId])

  useEffect(() => {
    if (!isCredito && form.esMsi) {
      setForm((prev) => ({ ...prev, esMsi: false }))
    }
  }, [isCredito, form.esMsi])

  async function deshacerGasto(params: {
    gastoIds: number[]
    pendingId?: string
    optimisticTempIds: string[]
    cuentaId: string
    saldoMonto: number
  }) {
    if (!user) return

    if (params.pendingId) {
      await removePendingGasto(params.pendingId)
    } else if (params.gastoIds.length > 0) {
      const { error } = await supabase
        .from('gastos')
        .delete()
        .in('id', params.gastoIds)
        .eq('user_id', user.id)

      if (error) {
        showError(`No se pudo deshacer: ${error.message}`)
        return
      }
    }

    if (params.optimisticTempIds.length > 0) {
      removeOptimisticGastos(params.optimisticTempIds)
    }

    const { error: saldoError } = await revertGastoSaldo(params.cuentaId, params.saldoMonto)
    if (saldoError) {
      showError(`Gasto eliminado, pero el saldo no se revirtió: ${saldoError}`)
      refresh()
      return
    }

    refresh()
    showInfo('Gasto deshecho.')
  }

  async function submitGasto(data: FormState) {
    const montoError = validateMonto(data.monto)
    if (montoError) {
      showError(montoError)
      return
    }

    const cuentaError = validateCuentaId(data.cuentaId)
    if (cuentaError) {
      showError(cuentaError)
      return
    }

    if (!user) {
      showError('Debes iniciar sesión para guardar un gasto.')
      return
    }

    const categoria = data.categoria
    const cuentaIdResolved = data.cuentaId

    let descripcion = data.descripcion.trim()
    if (!descripcion) {
      descripcion = categoria
    }

    const descripcionError = validateDescripcion(descripcion)
    if (descripcionError) {
      showError(descripcionError)
      return
    }

    const monto = parseMontoValue(data.monto)

    const gastosHoy = [
      ...optimisticGastos
        .filter((gasto) => isToday(gasto.fecha))
        .map((gasto) => ({ descripcion: gasto.descripcion, monto: gasto.monto })),
    ]

    if (isOnline()) {
      const hoy = new Date()
      const { inicio, fin } = getDayFechaBounds(hoy)
      const { data: hoyData } = await supabase
        .from('gastos')
        .select('descripcion, monto')
        .eq('user_id', user.id)
        .gte('fecha', inicio)
        .lt('fecha', fin)

      for (const row of hoyData ?? []) {
        gastosHoy.push({
          descripcion: String(row.descripcion ?? ''),
          monto: Number(row.monto),
        })
      }
    }

    const duplicado = findDuplicadoHoy(descripcion, monto, gastosHoy)
    if (duplicado) {
      showWarning(
        `Ya registraste algo similar hoy: ${duplicado.descripcion} ${formatCurrency(duplicado.monto)}`,
      )
    }

    const formBackup = { ...data, descripcion, categoria, cuentaId: cuentaIdResolved }

    const selectedCuentaForSubmit = cuentas.find((c) => String(c.id) === cuentaIdResolved)
    const isCreditoForSubmit = selectedCuentaForSubmit?.tipo === 'credito'

    let rows = [buildSingleGasto({ monto, categoria, descripcion, cuentaId: cuentaIdResolved })]

    if (data.esMsi && isCreditoForSubmit) {
      const mesesError = validateMsiMeses(data.mesesMsi)
      if (mesesError) {
        showError(mesesError)
        return
      }
      const meses = Number(data.mesesMsi)
      rows = buildMsiGastos({
        totalMonto: monto,
        months: meses,
        categoria,
        descripcion,
        cuentaId: cuentaIdResolved,
      })
    }

    const offlinePayload =
      data.esMsi && isCreditoForSubmit
        ? {
            monto,
            categoria,
            descripcion,
            fecha: rows[0].fecha,
            cuenta_id: cuentaIdResolved,
            es_msi: true,
            grupo_msi_id: rows[0].grupo_msi_id,
            msiInstallments: rows,
          }
        : {
            monto,
            categoria,
            descripcion,
            fecha: rows[0].fecha,
            cuenta_id: cuentaIdResolved,
            es_msi: false,
            grupo_msi_id: null,
          }

    const saldoMonto = montoParaSaldoCuenta(
      monto,
      data.esMsi && isCreditoForSubmit,
      monto,
    )

    const { error: saldoError } = await applyGastoSaldo(cuentaIdResolved, saldoMonto)
    if (saldoError) {
      showError(`No se pudo actualizar el saldo: ${saldoError}`)
      return
    }

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

    const resetForm = (): void => {
      setForm({
        ...initialForm,
        cuentaId: cuentaIdResolved,
      })
    }

    if (!isOnline()) {
      setGuardando(true)
      const pending = await addPendingGasto({
        ...offlinePayload,
        userId: user.id,
        optimisticTempIds: tempIds,
      })
      setGuardando(false)
      resetForm()
      recordUltimoRegistro(user.id, cuentaIdResolved)
      markAppVisit()
      refresh()
      const msg =
        rows.length > 1
          ? `Sin conexión. Compra MSI (${rows.length} pagos) guardada localmente.`
          : 'Sin conexión. Gasto guardado localmente y se sincronizará al volver internet.'
      showSuccessWithUndo(msg, () =>
        deshacerGasto({
          pendingId: pending.id,
          optimisticTempIds: tempIds,
          gastoIds: [],
          cuentaId: cuentaIdResolved,
          saldoMonto,
        }),
      )
      return
    }

    resetForm()
    showInfo(rows.length > 1 ? `Guardando compra MSI (${rows.length} pagos)...` : 'Guardando gasto...')
    setGuardando(true)

    const { data: inserted, error } = await supabase.from('gastos').insert(rows).select('id')

    setGuardando(false)

    if (error) {
      removeOptimisticGastos(tempIds)
      await revertGastoSaldo(cuentaIdResolved, saldoMonto)
      setForm(formBackup)
      showError(`Error al guardar el gasto: ${error.message}`)
      return
    }

    removeOptimisticGastos(tempIds)
    const gastoIds = (inserted ?? []).map((row) => row.id as number)

    recordUltimoRegistro(user.id, cuentaIdResolved)
    markAppVisit()
    refresh()
    showSuccessWithUndo(
      rows.length > 1
        ? `Compra MSI registrada: ${rows.length} mensualidades.`
        : `${formatCurrency(monto)} · ${categoria}`,
      () =>
        deshacerGasto({
          gastoIds,
          optimisticTempIds: [],
          cuentaId: cuentaIdResolved,
          saldoMonto,
        }),
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await submitGasto(form)
  }

  return (
    <form onSubmit={handleSubmit} className={`${cardClassName} ${registroFormClassName}`}>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-white">Nuevo gasto</h2>
        <p className="text-sm text-slate-400">Monto, tarjeta y categoría. Tú eliges todo.</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="monto" className="block text-sm font-medium text-slate-300">
          Monto
        </label>
        <MontoInput
          ref={montoInputRef}
          id="monto"
          value={form.monto}
          onChange={(value) => setForm((prev) => ({ ...prev, monto: value }))}
          placeholder="0"
          required
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-300">
          ¿Con qué pagaste?
          {cuentas.length > 1 && !form.cuentaId && (
            <span className="ml-1 font-normal text-pulso-warning">Elige una</span>
          )}
        </p>
        {cuentasLoading ? (
          <p className="text-sm text-slate-500">Cargando cuentas...</p>
        ) : cuentas.length === 0 ? (
          <p className="text-sm text-slate-500">Añade una cuenta en Ajustes para registrar gastos.</p>
        ) : (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Cuenta de pago">
            {cuentas.map((cuenta) => {
              const active = form.cuentaId === cuenta.id
              return (
                <button
                  key={cuenta.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setForm((prev) => ({ ...prev, cuentaId: cuenta.id }))}
                  className={chipPickerClassName(active)}
                >
                  {cuenta.nombre}
                  {cuenta.tipo === 'credito' ? ' · Crédito' : ''}
                </button>
              )
            })}
          </div>
        )}
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
              aria-label="Meses sin intereses"
              onClick={() => setForm((prev) => ({ ...prev, esMsi: !prev.esMsi }))}
              className={`relative h-7 w-12 shrink-0 rounded-full transition active:scale-[0.98] ${
                form.esMsi ? 'bg-pulso-accent' : 'bg-slate-600'
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
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-300">Categoría</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Categoría">
          {categorias.map((categoria) => {
            const active = form.categoria === categoria
            return (
              <button
                key={categoria}
                type="button"
                aria-pressed={active}
                onClick={() => setForm((prev) => ({ ...prev, categoria }))}
                className={chipPickerClassName(active)}
              >
                {categoria}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="descripcion" className="block text-sm font-medium text-slate-300">
          Descripción (opcional)
        </label>
        <input
          id="descripcion"
          type="text"
          inputMode="text"
          maxLength={200}
          placeholder="Ej. Restaurante, Amazon, gasolina…"
          value={form.descripcion}
          onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))}
          className={inputClassName}
        />
      </div>

      <div className={formSubmitStickyClassName}>
        <button
          type="submit"
          disabled={guardando || cuentas.length === 0 || !form.cuentaId}
          className={buttonPrimaryClassName}
        >
          {guardando
            ? 'Guardando...'
            : form.esMsi
              ? 'Registrar compra MSI'
              : 'Guardar gasto'}
        </button>
      </div>
    </form>
  )
})
