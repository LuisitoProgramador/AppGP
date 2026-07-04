import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useCuentas, useGastosRefreshState } from '../../contexts'
import { updateMsiGrupo, cambiarCuentaMsiGrupo, type MsiGrupoUndoSnapshot } from '../../services/msiGrupo'
import { updateGastoSimple } from '../../services/gastos'
import { supabase } from '../../services/supabase'
import type { MsiInstallmentUpdate } from '../../types/gasto'
import { formatCurrency } from '../../utils/formatCurrency'
import { formatMontoFromNumber, parseMontoValue } from '../../utils/montoInput'
import { sumMsiGrupoMontos } from '../../utils/gastoSaldo'
import { buildMsiGastos, parseMsiDescripcion, toMsiInstallmentUpdates } from '../../utils/msi'
import { isGastoFechaPasada } from '../../utils/date'
import { isOnline } from '../../utils/network'
import { showError, showInfo, showSuccess, showSuccessWithUndo } from '../../utils/toast'
import {
  validateCuentaId,
  validateDescripcion,
  validateMonto,
  validateMsiMeses,
  validateNombre,
} from '../../utils/validation'
import type { EditGastoModalProps, GrupoMsiRow } from './types'
import { OFFLINE_CUENTA_MSG } from './types'

export function useEditGastoModal({ gasto, onClose, modoInicial = 'cuota' }: EditGastoModalProps) {
  const { refresh } = useGastosRefreshState()
  const { cuentas, cuentasLoading, refreshCuentas } = useCuentas()
  const [monto, setMonto] = useState(formatMontoFromNumber(gasto.monto))
  const [categoria, setCategoria] = useState(gasto.categoria)
  const [descripcion, setDescripcion] = useState(gasto.descripcion ?? '')
  const [cuentaId, setCuentaId] = useState(gasto.cuenta_id ?? '')
  const [guardando, setGuardando] = useState(false)
  const [grupoRows, setGrupoRows] = useState<GrupoMsiRow[]>([])
  const [cargandoGrupo, setCargandoGrupo] = useState(false)
  const [corregirTotal, setCorregirTotal] = useState(modoInicial === 'compra')
  const [totalCompra, setTotalCompra] = useState('')
  const [mesesMsi, setMesesMsi] = useState('3')
  const [descripcionBase, setDescripcionBase] = useState('')

  const esMsi = Boolean(gasto.es_msi && gasto.grupo_msi_id)
  const gastoPasado = useMemo(() => isGastoFechaPasada(gasto.fecha), [gasto.fecha])
  const edicionBloqueada = useMemo(
    () => gastoPasado && (!esMsi || !corregirTotal),
    [gastoPasado, esMsi, corregirTotal],
  )
  const msiInfo = useMemo(
    () => parseMsiDescripcion(gasto.descripcion ?? ''),
    [gasto.descripcion],
  )
  const totalGrupo = useMemo(
    () => sumMsiGrupoMontos(grupoRows.length > 0 ? grupoRows : [{ monto: gasto.monto }]),
    [grupoRows, gasto.monto],
  )

  const cuentaOriginal = gasto.cuenta_id ?? ''
  const cuentaCambio = cuentaId !== cuentaOriginal

  const previewCuotas = useMemo(() => {
    if (!corregirTotal || !esMsi || !cuentaId || grupoRows.length === 0) return []

    const totalError = validateMonto(totalCompra)
    const mesesError = validateMsiMeses(mesesMsi)
    if (totalError || mesesError) return []

    const total = parseMontoValue(totalCompra)
    const meses = Number(mesesMsi)
    const base =
      descripcionBase.trim() ||
      parseMsiDescripcion(grupoRows[0]?.descripcion ?? '')?.base ||
      'Compra MSI'

    return buildMsiGastos({
      totalMonto: total,
      months: meses,
      categoria,
      descripcion: base,
      cuentaId,
      startDate: new Date(grupoRows[0].fecha),
      grupoMsiId: gasto.grupo_msi_id!,
    })
  }, [
    corregirTotal,
    esMsi,
    cuentaId,
    gasto.grupo_msi_id,
    grupoRows,
    totalCompra,
    mesesMsi,
    descripcionBase,
    categoria,
  ])

  useEffect(() => {
    if (!esMsi || !gasto.grupo_msi_id) return

    async function cargarGrupo() {
      setCargandoGrupo(true)
      const { data, error } = await supabase
        .from('gastos')
        .select('id, monto, descripcion, fecha, categoria')
        .eq('grupo_msi_id', gasto.grupo_msi_id)
        .order('fecha', { ascending: true })

      setCargandoGrupo(false)

      if (error) {
        showError(`No se pudo cargar el grupo MSI: ${error.message}`)
        return
      }

      const rows = (data ?? []) as GrupoMsiRow[]
      setGrupoRows(rows)
      setTotalCompra(formatMontoFromNumber(sumMsiGrupoMontos(rows)))
      setMesesMsi(String(rows.length))

      const parsed = parseMsiDescripcion(rows[0]?.descripcion ?? gasto.descripcion ?? '')
      setDescripcionBase(parsed?.base ?? gasto.descripcion ?? '')
    }

    cargarGrupo()
  }, [esMsi, gasto.grupo_msi_id, gasto.descripcion])

  function buildInstallmentsFromGrupo(
    patchCuota?: { monto: number; descripcion: string },
  ): MsiInstallmentUpdate[] {
    return grupoRows.map((row) => {
      if (patchCuota && row.id === gasto.id) {
        return {
          monto: patchCuota.monto,
          descripcion: patchCuota.descripcion,
          fecha: row.fecha,
        }
      }

      return {
        monto: Number(row.monto),
        descripcion: row.descripcion ?? '',
        fecha: row.fecha,
      }
    })
  }

  function validarCambioCuenta(): string | null {
    if (!cuentaCambio) return null
    if (!isOnline()) return OFFLINE_CUENTA_MSG
    return validateCuentaId(cuentaId)
  }

  function buildUndoSnapshot(): MsiGrupoUndoSnapshot | null {
    if (!gasto.grupo_msi_id || !gasto.cuenta_id || grupoRows.length === 0) return null

    return {
      grupoMsiId: gasto.grupo_msi_id,
      cuentaId: gasto.cuenta_id,
      categoria: grupoRows[0].categoria,
      installments: grupoRows.map((row) => ({
        monto: Number(row.monto),
        descripcion: row.descripcion ?? '',
        fecha: row.fecha,
      })),
      totalCompra: sumMsiGrupoMontos(grupoRows),
    }
  }

  async function deshacerCorreccionMsi(
    snapshot: MsiGrupoUndoSnapshot,
    newTotal: number,
  ): Promise<void> {
    const { error } = await updateMsiGrupo({
      grupoMsiId: snapshot.grupoMsiId,
      categoria: snapshot.categoria,
      cuentaId: snapshot.cuentaId,
      installments: snapshot.installments,
      idempotencyKey: crypto.randomUUID(),
      saldo: {
        totalAnterior: newTotal,
        totalNuevo: snapshot.totalCompra,
      },
    })

    if (error) {
      showError(`No se pudo deshacer: ${error}`)
      return
    }

    await refreshCuentas()
    refresh()
    showInfo('Corrección MSI deshecha.')
  }

  async function guardarCorreccionTotal(): Promise<boolean> {
    const totalError = validateMonto(totalCompra)
    if (totalError) {
      showError(totalError)
      return false
    }

    const mesesError = validateMsiMeses(mesesMsi)
    if (mesesError) {
      showError(mesesError)
      return false
    }

    const nombreError = validateNombre(descripcionBase, 'La descripción de la compra')
    if (nombreError) {
      showError(nombreError)
      return false
    }

    const cuentaError = validarCambioCuenta()
    if (cuentaError) {
      showError(cuentaError)
      return false
    }

    if (!gasto.grupo_msi_id || grupoRows.length === 0) {
      showError('No se encontró el grupo MSI para corregir.')
      return false
    }

    const cuentaAnteriorId = gasto.cuenta_id
    if (!cuentaAnteriorId && !cuentaId) {
      showError('Selecciona la cuenta de pago de la compra.')
      return false
    }

    if (previewCuotas.length === 0) {
      showError('No se pudo calcular la redistribución de cuotas.')
      return false
    }

    const snapshot = buildUndoSnapshot()
    if (!snapshot) {
      showError('No se pudo preparar la corrección MSI.')
      return false
    }

    const newTotal = parseMontoValue(totalCompra)
    const newCuentaId = cuentaId || cuentaAnteriorId!
    const cambioCuentaMsi = cuentaAnteriorId !== newCuentaId
    const installments = toMsiInstallmentUpdates(previewCuotas)

    const result = await updateMsiGrupo({
      grupoMsiId: gasto.grupo_msi_id,
      categoria,
      cuentaId: newCuentaId,
      installments,
      idempotencyKey: crypto.randomUUID(),
      saldo: {
        cuentaAnteriorId: cambioCuentaMsi ? cuentaAnteriorId : undefined,
        totalAnterior: snapshot.totalCompra,
        totalNuevo: newTotal,
      },
    })

    if (result.error) {
      showError(`Error al actualizar compra MSI: ${result.error}`)
      return false
    }

    await refreshCuentas()
    refresh()
    const meses = Number(mesesMsi)
    if (result.recoveredFromServer) {
      showInfo('Compra MSI confirmada en el servidor tras un error de red.')
    }
    showSuccessWithUndo(
      `Compra MSI actualizada: ${formatCurrency(newTotal)} en ${meses} cuotas.`,
      () => deshacerCorreccionMsi(snapshot, newTotal),
    )
    return true
  }

  async function guardarCuotaIndividual(): Promise<boolean> {
    const cuentaError = validarCambioCuenta()
    if (cuentaError) {
      showError(cuentaError)
      return false
    }

    const hayCambiosCuota =
      !edicionBloqueada &&
      (parseMontoValue(monto) !== gasto.monto ||
        descripcion.trim() !== (gasto.descripcion ?? '').trim() ||
        categoria !== gasto.categoria)

    if (edicionBloqueada && !cuentaCambio) {
      showError(
        'No puedes editar cuotas pasadas. Usa "Editar compra MSI completa" para ajustar el total.',
      )
      return false
    }

    if (cuentaCambio) {
      if (!gasto.cuenta_id || !gasto.grupo_msi_id || grupoRows.length === 0) {
        showError('No se encontró el grupo MSI para mover la cuenta.')
        return false
      }

      const montoError = hayCambiosCuota ? validateMonto(monto) : null
      if (montoError) {
        showError(montoError)
        return false
      }

      const descripcionError = hayCambiosCuota ? validateDescripcion(descripcion) : null
      if (descripcionError) {
        showError(descripcionError)
        return false
      }

      const totalGrupoLocal = sumMsiGrupoMontos(grupoRows)
      const installments = buildInstallmentsFromGrupo(
        hayCambiosCuota
          ? { monto: parseMontoValue(monto), descripcion: descripcion.trim() }
          : undefined,
      )

      const result = await cambiarCuentaMsiGrupo({
        grupoMsiId: gasto.grupo_msi_id,
        categoria: hayCambiosCuota ? categoria : grupoRows[0].categoria,
        cuentaAnteriorId: gasto.cuenta_id,
        cuentaNuevaId: cuentaId,
        installments,
        totalCompra: totalGrupoLocal,
        idempotencyKey: crypto.randomUUID(),
      })

      if (result.error) {
        showError(`No se pudo actualizar la cuenta del grupo MSI: ${result.error}`)
        return false
      }

      if (result.recoveredFromServer) {
        showInfo('Cambio de cuenta MSI confirmado en el servidor tras un error de red.')
      }

      await refreshCuentas()
      return true
    }

    if (!hayCambiosCuota) return true

    const montoError = validateMonto(monto)
    if (montoError) {
      showError(montoError)
      return false
    }

    const descripcionError = validateDescripcion(descripcion)
    if (descripcionError) {
      showError(descripcionError)
      return false
    }

    const { error } = await supabase
      .from('gastos')
      .update({
        monto: parseMontoValue(monto),
        categoria,
        descripcion: descripcion.trim(),
      })
      .eq('id', gasto.id)

    if (error) {
      showError(`Error al actualizar: ${error.message}`)
      return false
    }

    return true
  }

  async function guardarGastoNormal(): Promise<boolean> {
    if (gastoPasado && !cuentaCambio) {
      showError('No puedes editar gastos con fecha pasada.')
      return false
    }

    const cuentaError = validarCambioCuenta()
    if (cuentaError) {
      showError(cuentaError)
      return false
    }

    const montoError = validateMonto(monto)
    if (montoError) {
      showError(montoError)
      return false
    }

    const descripcionError = validateDescripcion(descripcion)
    if (descripcionError) {
      showError(descripcionError)
      return false
    }

    const newMonto = parseMontoValue(monto)
    const newCuentaId = cuentaId || null

    const { error } = await updateGastoSimple({
      gastoId: gasto.id,
      monto: newMonto,
      categoria,
      descripcion: descripcion.trim(),
      cuentaId: newCuentaId,
    })

    if (error) {
      showError(`Error al actualizar: ${error}`)
      return false
    }

    await refreshCuentas()
    refresh()
    return true
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setGuardando(true)

    if (esMsi && corregirTotal) {
      const ok = await guardarCorreccionTotal()
      setGuardando(false)
      if (ok) onClose()
      return
    }

    let ok = false
    if (esMsi) {
      ok = await guardarCuotaIndividual()
    } else {
      ok = await guardarGastoNormal()
    }

    setGuardando(false)

    if (!ok) return

    refresh()
    if (esMsi && cuentaCambio) {
      showSuccess(
        `Cuenta de la compra MSI actualizada. Se movieron ${grupoRows.length} cuotas (${formatCurrency(totalGrupo)}).`,
      )
    } else if (esMsi && parseMontoValue(monto) !== gasto.monto) {
      showInfo(
        'Cuota actualizada. El saldo de crédito no cambia — usa "Editar compra MSI" si el monto total estaba mal.',
      )
    } else if (cuentaCambio) {
      showSuccess('Gasto actualizado y cuenta de pago cambiada correctamente.')
    } else {
      showSuccess('Gasto actualizado correctamente.')
    }
    onClose()
  }

  return {
    cuentas,
    cuentasLoading,
    monto,
    setMonto,
    categoria,
    setCategoria,
    descripcion,
    setDescripcion,
    cuentaId,
    setCuentaId,
    guardando,
    cargandoGrupo,
    corregirTotal,
    setCorregirTotal,
    totalCompra,
    setTotalCompra,
    mesesMsi,
    setMesesMsi,
    descripcionBase,
    setDescripcionBase,
    esMsi,
    gastoPasado,
    edicionBloqueada,
    msiInfo,
    totalGrupo,
    cuentaCambio,
    previewCuotas,
    grupoRows,
    handleSubmit,
  }
}
