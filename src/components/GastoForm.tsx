import { type FormEvent, useEffect, useMemo, useRef, useState, memo, type KeyboardEvent } from 'react'
import { useAuthSession, useCuentas, useGastosRefreshState, useOptimisticGastosState } from '../contexts'
import { useCategorias } from '../hooks/useCategorias'
import { getDefaultCuentaId } from '../services/cuentas'
import { getCategoryRules, resolveCategoriaFromRules } from '../services/categoryRules'
import {
  getMerchantMemory,
  matchMerchantMemory,
  recordMerchantMemory,
  refreshMerchantMemory,
  type MerchantMemoryEntry,
} from '../services/merchantMemory'
import { addPendingGasto, removePendingGasto } from '../services/offlineQueue'
import {
  getRegistroPrefs,
  recordUltimoRegistro,
  saveRegistroPrefs,
} from '../services/registroPrefs'
import { supabase } from '../services/supabase'
import { CATEGORIAS_DEFAULT, type Categoria } from '../types/gasto'
import { parseGastoInput } from '../utils/parser'
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
import { cardClassName, formSubmitStickyClassName, inputClassName, buttonPrimaryClassName, registroFormClassName } from './formStyles'
import Select from './Select'
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
  categoria: CATEGORIAS_DEFAULT[0],
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
  const { categorias, selectOptions } = useCategorias(user?.id)
  const [form, setForm] = useState(initialForm)
  const [modoRapido, setModoRapido] = useState(true)
  const [mostrarDetalle, setMostrarDetalle] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [merchantMemory, setMerchantMemory] = useState<MerchantMemoryEntry[]>([])
  const [montoSugerido, setMontoSugerido] = useState<number | null>(null)
  const montoInputRef = useRef<HTMLInputElement>(null)
  const urlQueryHandled = useRef(false)

  const selectedCuenta = cuentas.find((c) => String(c.id) === form.cuentaId)
  const isCredito = selectedCuenta?.tipo === 'credito'

  useEffect(() => {
    if (!user) return
    const prefs = getRegistroPrefs(user.id)
    setModoRapido(prefs.modoRapido)
    setMerchantMemory(getMerchantMemory(user.id))
    if (isOnline()) {
      refreshMerchantMemory(user.id).then(setMerchantMemory).catch(() => {})
    }
  }, [user])

  useEffect(() => {
    if (!user || cuentasLoading || cuentas.length === 0) return
    const prefs = getRegistroPrefs(user.id)
    const cuentaId =
      prefs.ultimaCuentaId && cuentas.some((c) => c.id === prefs.ultimaCuentaId)
        ? prefs.ultimaCuentaId
        : getDefaultCuentaId(cuentas)
    const categoria =
      prefs.ultimaCategoria && categorias.includes(prefs.ultimaCategoria)
        ? prefs.ultimaCategoria
        : categorias[0]

    setForm((prev) => ({
      ...prev,
      cuentaId: prev.cuentaId || (cuentaId ? String(cuentaId) : ''),
      categoria: prev.categoria === CATEGORIAS_DEFAULT[0] ? categoria : prev.categoria,
    }))
  }, [user, cuentas, cuentasLoading, categorias])

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
    if (urlQueryHandled.current) return

    const params = new URLSearchParams(window.location.search)
    const query = params.get('q')
    if (query === null) return

    urlQueryHandled.current = true

    params.delete('q')
    const montoParam = params.get('m')
    if (montoParam) {
      params.delete('m')
      setForm((prev) => ({ ...prev, monto: montoParam.replace(/[^\d.,]/g, '') }))
    }
    const tabParam = params.get('tab')
    if (tabParam === 'registro') params.delete('tab')
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
      const parsed = parseGastoInput(query, historial, categorias)
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
  }, [merchantMemory, categorias])

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

  function toggleModoRapido() {
    if (!user) return
    const next = !modoRapido
    setModoRapido(next)
    saveRegistroPrefs(user.id, { modoRapido: next })
    if (next) setMostrarDetalle(false)
  }

  async function submitGasto(data: FormState, options?: { rapido?: boolean }) {
    const esRapido = options?.rapido ?? (modoRapido && !mostrarDetalle)

    const montoError = validateMonto(data.monto)
    if (montoError) {
      showError(montoError)
      return
    }

    let descripcion = data.descripcion.trim()
    if (esRapido && !descripcion) {
      descripcion = 'Gasto rápido'
    }

    const descripcionError = validateDescripcion(descripcion)
    if (descripcionError) {
      showError(descripcionError)
      return
    }

    let categoria = data.categoria
    let cuentaId = data.cuentaId

    if (esRapido && user) {
      const rules = getCategoryRules(user.id)
      categoria = resolveCategoriaFromRules(
        descripcion,
        rules,
        merchantMemory,
        data.categoria || categorias[0] || 'Otros',
      )
      if (!cuentaId) {
        const prefs = getRegistroPrefs(user.id)
        cuentaId =
          prefs.ultimaCuentaId ??
          getDefaultCuentaId(cuentas) ??
          ''
      }
    }

    const cuentaError = validateCuentaId(cuentaId)
    if (cuentaError) {
      showError(cuentaError)
      return
    }

    if (!user) {
      showError('Debes iniciar sesión para guardar un gasto.')
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

    const cuentaIdResolved = cuentaId
    const formBackup = { ...data, descripcion, categoria, cuentaId: cuentaIdResolved }

    const selectedCuentaForSubmit = cuentas.find((c) => String(c.id) === cuentaIdResolved)
    const isCreditoForSubmit = selectedCuentaForSubmit?.tipo === 'credito'

    let rows = [buildSingleGasto({ monto, categoria, descripcion, cuentaId: cuentaIdResolved })]

    if (!esRapido && data.esMsi && isCreditoForSubmit) {
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

    const offlinePayload = !esRapido && data.esMsi && isCreditoForSubmit
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
      !esRapido && data.esMsi && isCreditoForSubmit,
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

    if (!isOnline()) {
      setGuardando(true)
      const pending = await addPendingGasto({
        ...offlinePayload,
        userId: user.id,
        optimisticTempIds: tempIds,
      })
      setGuardando(false)
      setForm({
        ...initialForm,
        cuentaId: cuentaIdResolved,
        categoria,
      })
      recordUltimoRegistro(user.id, categoria, cuentaIdResolved)
      markAppVisit()
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
          cuentaId: cuentaIdResolved,
          saldoMonto,
        }),
      )
      return
    }

    setForm({
      ...initialForm,
      cuentaId: cuentaIdResolved,
      categoria,
    })
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

    recordUltimoRegistro(user.id, categoria, cuentaIdResolved)
    markAppVisit()
    recordMerchantMemory(user.id, descripcion, categoria, monto)
    setMerchantMemory(getMerchantMemory(user.id))
    refresh()
    showSuccessWithUndo(
      esRapido
        ? `${formatCurrency(monto)} · ${categoria}`
        : rows.length > 1
          ? `Compra MSI registrada: ${rows.length} mensualidades.`
          : 'Gasto guardado correctamente.',
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

  function handleMontoKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter' || !modoRapido || mostrarDetalle) return
    event.preventDefault()
    void submitGasto(form, { rapido: true })
  }

  const prefsLabel =
    form.categoria && form.cuentaId
      ? `${form.categoria} · ${cuentas.find((c) => c.id === form.cuentaId)?.nombre ?? 'Cuenta'}`
      : 'Se infiere de tu último registro'

  return (
    <form onSubmit={handleSubmit} className={`${cardClassName} ${registroFormClassName}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-white">Nuevo gasto</h2>
          <p className="text-sm text-slate-400">
            {modoRapido && !mostrarDetalle
              ? 'Monto + Enter. Ideal para iPhone.'
              : 'Registra un movimiento'}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleModoRapido}
          className="shrink-0 text-xs font-medium text-pulso-accent-muted underline-offset-2 hover:text-pulso-accent hover:underline"
        >
          {modoRapido ? 'Modo detalle' : 'Modo rápido'}
        </button>
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
          placeholder={montoSugerido ? formatCurrency(montoSugerido) : '0'}
          onKeyDown={handleMontoKeyDown}
          required
          autoFocus
        />
        {modoRapido && !mostrarDetalle && (
          <p className="text-xs text-slate-500">
            Enter para guardar · {prefsLabel}
          </p>
        )}
        {merchantMatch && (
          <p className="text-xs text-slate-500">
            Habituales: {merchantMatch.categoria}
            {montoSugerido ? ` · ~${formatCurrency(montoSugerido)}` : ''}
          </p>
        )}
      </div>

      {modoRapido && !mostrarDetalle ? (
        <>
          <div className="space-y-2">
            <label htmlFor="descripcion-rapida" className="block text-sm font-medium text-slate-300">
              Descripción (opcional)
            </label>
            <input
              id="descripcion-rapida"
              type="text"
              inputMode="text"
              maxLength={200}
              placeholder="Ej. Oxxo, Uber…"
              value={form.descripcion}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, descripcion: e.target.value }))
              }
              className={inputClassName}
            />
          </div>
          <button
            type="button"
            onClick={() => setMostrarDetalle(true)}
            className="text-xs text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
          >
            MSI, cuenta u otra categoría
          </button>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <label htmlFor="cuenta" className="block text-sm font-medium text-slate-300">
              Cuenta de Pago
            </label>
            <Select
              id="cuenta"
              value={form.cuentaId}
              onChange={(cuentaId) => setForm((prev) => ({ ...prev, cuentaId }))}
              options={[
                ...(cuentasLoading
                  ? [{ value: '', label: 'Cargando cuentas...', disabled: true }]
                  : []),
                ...(!cuentasLoading && cuentas.length === 0
                  ? [
                      {
                        value: '',
                        label: 'No hay cuentas configuradas. Añade una para comenzar.',
                        disabled: true,
                      },
                    ]
                  : []),
                ...cuentas.map((cuenta) => ({
                  value: String(cuenta.id),
                  label: `${cuenta.nombre}${cuenta.tipo === 'credito' ? ' (Crédito)' : ''}`,
                })),
              ]}
              disabled={cuentasLoading || cuentas.length === 0}
              required
            />
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
            <label htmlFor="categoria" className="block text-sm font-medium text-slate-300">
              Categoría
            </label>
            <Select
              id="categoria"
              value={form.categoria}
              onChange={(categoria) =>
                setForm((prev) => ({
                  ...prev,
                  categoria,
                }))
              }
              options={selectOptions}
              required
            />
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
        </>
      )}

      <div className={formSubmitStickyClassName}>
        <button
          type="submit"
          disabled={guardando || cuentas.length === 0}
          className={buttonPrimaryClassName}
        >
          {guardando ? 'Guardando...' : modoRapido && !mostrarDetalle ? 'Guardar' : form.esMsi ? 'Registrar compra MSI' : 'Guardar Gasto'}
        </button>
      </div>
    </form>
  )
})
