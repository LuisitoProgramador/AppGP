import { type FormEvent, useEffect, useMemo, useRef, useState, memo } from 'react'
import { useAuthContext, useCuentas, useGastosData } from '../contexts'
import { getDefaultCuentaId } from '../services/cuentas'
import {
  getMerchantMemory,
  matchMerchantMemory,
  recordMerchantMemory,
  refreshMerchantMemory,
  type MerchantMemoryEntry,
} from '../services/merchantMemory'
import { notifyTelegram } from '../services/notifyTelegram'
import { addPendingGasto, removePendingGasto } from '../services/offlineQueue'
import { supabase } from '../services/supabase'
import { CATEGORIAS, type Categoria } from '../types/gasto'
import { parseGastoInput } from '../utils/parser'
import { formatCurrency } from '../utils/formatCurrency'
import { buildMsiGastos, buildSingleGasto } from '../utils/msi'
import { montoParaSaldoCuenta } from '../utils/cuentaSaldo'
import { findDuplicadoHoy, isToday } from '../utils/duplicateGasto'
import { isOnline } from '../utils/network'
import { showError, showInfo, showSuccessWithUndo, showWarning } from '../utils/toast'
import { validateCuentaId, validateDescripcion, validateMonto, validateMsiMeses } from '../utils/validation'
import { cardClassName, chipButtonClassName, formSubmitStickyClassName, formWithKeyboardClassName, inputClassName, buttonPrimaryClassName } from './formStyles'

const initialForm = {
  monto: '',
  categoria: CATEGORIAS[0],
  descripcion: '',
  cuentaId: '',
  esMsi: false,
  mesesMsi: '3',
}

type FormState = typeof initialForm

interface UltimoGastoChip {
  descripcion: string
  monto: number
  categoria: Categoria
  cuentaId: string
}

export default memo(function GastoForm() {
  const { user } = useAuthContext()
  const { refresh, refreshKey, addOptimisticGasto, removeOptimisticGastos, optimisticGastos } =
    useGastosData()
  const { cuentas, cuentasLoading, applyGastoSaldo, revertGastoSaldo } = useCuentas()
  const [form, setForm] = useState(initialForm)
  const [guardando, setGuardando] = useState(false)
  const [merchantMemory, setMerchantMemory] = useState<MerchantMemoryEntry[]>([])
  const [montoSugerido, setMontoSugerido] = useState<number | null>(null)
  const [ultimoGasto, setUltimoGasto] = useState<UltimoGastoChip | null>(null)
  const montoInputRef = useRef<HTMLInputElement>(null)

  const selectedCuenta = cuentas.find((c) => String(c.id) === form.cuentaId)
  const isCredito = selectedCuenta?.tipo === 'credito'

  useEffect(() => {
    if (!user) return
    const cached = getMerchantMemory(user.id)
    setMerchantMemory(cached)
    if (isOnline()) {
      refreshMerchantMemory(user.id).then(setMerchantMemory).catch(() => {})
    }
  }, [user, refreshKey])

  useEffect(() => {
    if (!user) return

    if (optimisticGastos.length > 0) {
      const gasto = optimisticGastos[0]
      setUltimoGasto({
        descripcion: gasto.descripcion,
        monto: gasto.monto,
        categoria: gasto.categoria as Categoria,
        cuentaId: gasto.cuenta_id ?? '',
      })
      return
    }

    supabase
      .from('gastos')
      .select('descripcion, monto, categoria, cuenta_id')
      .eq('user_id', user.id)
      .order('fecha', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          setUltimoGasto(null)
          return
        }
        setUltimoGasto({
          descripcion: data.descripcion ?? '',
          monto: Number(data.monto),
          categoria: data.categoria as Categoria,
          cuentaId: data.cuenta_id ?? '',
        })
      })
      .catch(() => {})
  }, [user, refreshKey, optimisticGastos])

  const merchantMatch = useMemo(
    () => matchMerchantMemory(form.descripcion, merchantMemory),
    [form.descripcion, merchantMemory],
  )

  useEffect(() => {
    if (!merchantMatch) {
      setMontoSugerido(null)
      return
    }
    setMontoSugerido(merchantMatch.montoFrecuente)
    setForm((prev) => {
      if (prev.categoria === merchantMatch.categoria) return prev
      return { ...prev, categoria: merchantMatch.categoria }
    })
  }, [merchantMatch])

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
      const historial = merchantMemory.map((entry) => ({
        descripcion: entry.descripcion,
        categoria: entry.categoria,
      }))
      const parsed = parseGastoInput(query, historial)
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

  function handleRepetirUltimo() {
    if (!ultimoGasto) return

    setForm((prev) => ({
      ...prev,
      monto: String(ultimoGasto.monto),
      categoria: ultimoGasto.categoria,
      descripcion: ultimoGasto.descripcion,
      cuentaId: ultimoGasto.cuentaId || prev.cuentaId,
      esMsi: false,
    }))
  }

  async function submitGasto(data: FormState) {
    const montoError = validateMonto(data.monto)
    if (montoError) {
      showError(montoError)
      return
    }

    const descripcionError = validateDescripcion(data.descripcion)
    if (descripcionError) {
      showError(descripcionError)
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

    const monto = Number(data.monto)
    const categoria = data.categoria
    const descripcion = data.descripcion.trim()

    const gastosHoy = [
      ...optimisticGastos
        .filter((gasto) => isToday(gasto.fecha))
        .map((gasto) => ({ descripcion: gasto.descripcion, monto: gasto.monto })),
    ]

    if (isOnline()) {
      const hoy = new Date()
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
      const fin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1)
      const { data: hoyData } = await supabase
        .from('gastos')
        .select('descripcion, monto')
        .eq('user_id', user.id)
        .gte('fecha', inicio.toISOString())
        .lt('fecha', fin.toISOString())

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

    const cuentaId = data.cuentaId
    const formBackup = { ...data }

    const selectedCuentaForSubmit = cuentas.find((c) => String(c.id) === cuentaId)
    const isCreditoForSubmit = selectedCuentaForSubmit?.tipo === 'credito'

    let rows = [buildSingleGasto({ monto, categoria, descripcion, cuentaId })]

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
        cuentaId,
      })
    }

    const offlinePayload = data.esMsi && isCreditoForSubmit
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

    const saldoMonto = montoParaSaldoCuenta(monto, data.esMsi && isCreditoForSubmit, monto)

    const { error: saldoError } = await applyGastoSaldo(cuentaId, saldoMonto)
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

    if (!isOnline()) {
      setGuardando(true)
      const pending = await addPendingGasto({ ...offlinePayload, optimisticTempIds: tempIds })
      setGuardando(false)
      setForm({ ...initialForm, cuentaId: data.cuentaId })
      recordMerchantMemory(user.id, descripcion, categoria, monto)
      setMerchantMemory(getMerchantMemory(user.id))
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
          cuentaId,
          saldoMonto,
        }),
      )
      return
    }

    setForm({ ...initialForm, cuentaId: data.cuentaId })
    showInfo(rows.length > 1 ? `Guardando compra MSI (${rows.length} pagos)...` : 'Guardando gasto...')
    setGuardando(true)

    const { data: inserted, error } = await supabase.from('gastos').insert(rows).select('id')

    setGuardando(false)

    if (error) {
      removeOptimisticGastos(tempIds)
      await revertGastoSaldo(cuentaId, saldoMonto)
      setForm(formBackup)
      showError(`Error al guardar el gasto: ${error.message}`)
      return
    }

    removeOptimisticGastos(tempIds)
    const gastoIds = (inserted ?? []).map((row) => row.id as number)

    await notifyTelegram({
      monto,
      categoria,
      descripcion:
        rows.length > 1 ? `${descripcion} (MSI x${rows.length})` : descripcion,
    })
    recordMerchantMemory(user.id, descripcion, categoria, monto)
    setMerchantMemory(getMerchantMemory(user.id))
    refresh()
    showSuccessWithUndo(
      rows.length > 1
        ? `Compra MSI registrada: ${rows.length} mensualidades.`
        : 'Gasto guardado correctamente.',
      () =>
        deshacerGasto({
          gastoIds,
          optimisticTempIds: [],
          cuentaId,
          saldoMonto,
        }),
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await submitGasto(form)
  }

  return (
    <form onSubmit={handleSubmit} className={`${cardClassName} ${formWithKeyboardClassName}`}>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-white">Nuevo gasto</h2>
        <p className="text-sm text-slate-400">Registra un movimiento</p>
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
          min="0.01"
          step="0.01"
          placeholder={montoSugerido ? `Sugerido: ${formatCurrency(montoSugerido)}` : '0.00'}
          value={form.monto}
          onChange={(e) => setForm((prev) => ({ ...prev, monto: e.target.value }))}
          className={inputClassName}
          required
        />
        {merchantMatch && (
          <p className="text-xs text-slate-500">
            Habituales: {merchantMatch.categoria}
            {montoSugerido ? ` · ~${formatCurrency(montoSugerido)}` : ''}
          </p>
        )}
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
            <option value="">No hay cuentas configuradas. Añade una para comenzar.</option>
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
              className={`relative h-7 w-12 shrink-0 rounded-full transition active:scale-[0.98] ${
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
        {ultimoGasto && (
          <button
            type="button"
            onClick={handleRepetirUltimo}
            className={chipButtonClassName}
          >
            Repetir {ultimoGasto.descripcion} · {formatCurrency(ultimoGasto.monto)}
          </button>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="descripcion" className="block text-sm font-medium text-slate-300">
          Descripción
        </label>
        <input
          id="descripcion"
          type="text"
          inputMode="text"
          maxLength={200}
          placeholder="Ej. Supermercado, transporte, suscripción"
          value={form.descripcion}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, descripcion: e.target.value }))
          }
          className={inputClassName}
          required
        />
      </div>

      <div className={formSubmitStickyClassName}>
        <button
          type="submit"
          disabled={guardando || cuentas.length === 0}
          className={buttonPrimaryClassName}
        >
          {guardando ? 'Guardando...' : form.esMsi ? 'Registrar compra MSI' : 'Guardar Gasto'}
        </button>
      </div>
    </form>
  )
})
