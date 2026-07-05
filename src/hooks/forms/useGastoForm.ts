import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { GASTO_QUERY_SCOPES } from '../../lib/invalidateAppQueries'
import { useAuthSession, useCuentas, useGastosRefreshState, useOptimisticGastosState } from '../../contexts'
import { useCategorias } from '../useCategorias'
import { getDefaultCuentaId } from '../../services/cuentas'
import { addPendingGasto, removePendingGasto } from '../../services/sync/offlineQueue'
import { recordUltimoRegistro } from '../../services/registroPrefs'
import { supabase } from '../../services/supabase'
import { type Categoria } from '../../types/gasto'
import { formatCurrency } from '../../utils/format/formatCurrency'
import { parseMontoValue } from '../../utils/format/montoInput'
import { buildMsiGastos, buildSingleGasto } from '../../utils/gastos/msi'
import { montoParaSaldoCuenta } from '../../utils/core/cuentaSaldo'
import { getDayFechaBounds } from '../../utils/date'
import { findDuplicadoHoy, isToday } from '../../utils/gastos/duplicateGasto'
import { markAppVisit } from '../../utils/dashboard/welcomeBack'
import { isOnline } from '../../utils/core/network'
import { showError, showInfo, showSuccessWithUndo, showWarning } from '../../utils/core/toast'
import { validateCuentaId, validateDescripcion, validateMonto, validateMsiMeses } from '../../utils/core/validation'

export const initialGastoForm = {
  monto: '',
  categoria: 'Otros' as Categoria,
  descripcion: '',
  cuentaId: '',
  esMsi: false,
  mesesMsi: '3',
}

export type GastoFormState = typeof initialGastoForm

function resolveGastoDescripcion(data: GastoFormState): string {
  const trimmed = data.descripcion.trim()
  return trimmed || data.categoria
}

export function getGastoFormValidationError(
  data: GastoFormState,
  isCredito: boolean,
): string | null {
  const montoError = validateMonto(data.monto)
  if (montoError) return montoError

  const cuentaError = validateCuentaId(data.cuentaId)
  if (cuentaError) return cuentaError

  const descripcionError = validateDescripcion(resolveGastoDescripcion(data))
  if (descripcionError) return descripcionError

  if (data.esMsi && isCredito) {
    const mesesError = validateMsiMeses(data.mesesMsi)
    if (mesesError) return mesesError
  }

  return null
}

export function useGastoForm() {
  const { user } = useAuthSession()
  const { refresh } = useGastosRefreshState()
  const { addOptimisticGasto, removeOptimisticGastos, optimisticGastos } =
    useOptimisticGastosState()
  const { cuentas, cuentasLoading, applyGastoSaldo, revertGastoSaldo } = useCuentas()
  const { categorias } = useCategorias(user?.id)
  const [form, setForm] = useState(initialGastoForm)
  const [guardando, setGuardando] = useState(false)
  const submitInFlightRef = useRef(false)
  const montoInputRef = useRef<HTMLInputElement>(null)

  const selectedCuenta = cuentas.find((c) => String(c.id) === form.cuentaId)
  const isCredito = selectedCuenta?.tipo === 'credito'
  const validationError = useMemo(
    () => getGastoFormValidationError(form, isCredito),
    [form, isCredito],
  )

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
      refresh(GASTO_QUERY_SCOPES)
      return
    }

    refresh(GASTO_QUERY_SCOPES)
    showInfo('Gasto deshecho.')
  }

  async function submitGasto(data: GastoFormState) {
    if (submitInFlightRef.current) return

    const submitError = getGastoFormValidationError(
      data,
      cuentas.find((c) => String(c.id) === data.cuentaId)?.tipo === 'credito',
    )
    if (submitError) {
      showError(submitError)
      return
    }

    if (!user) {
      showError('Debes iniciar sesión para guardar un gasto.')
      return
    }

    submitInFlightRef.current = true
    setGuardando(true)

    try {
    const categoria = data.categoria
    const cuentaIdResolved = data.cuentaId
    const descripcion = resolveGastoDescripcion(data)
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
        ...initialGastoForm,
        cuentaId: cuentaIdResolved,
      })
    }

    if (!isOnline()) {
      const pending = await addPendingGasto({
        ...offlinePayload,
        userId: user.id,
        optimisticTempIds: tempIds,
      })
      resetForm()
      recordUltimoRegistro(user.id, cuentaIdResolved)
      markAppVisit()
      refresh(GASTO_QUERY_SCOPES)
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

    const { data: inserted, error } = await supabase.from('gastos').insert(rows).select('id')

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
    refresh(GASTO_QUERY_SCOPES)
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
    } finally {
      submitInFlightRef.current = false
      setGuardando(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await submitGasto(form)
  }

  return {
    form,
    setForm,
    guardando,
    validationError,
    montoInputRef,
    cuentas,
    cuentasLoading,
    categorias,
    isCredito,
    handleSubmit,
  }
}
