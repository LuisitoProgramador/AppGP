import { type FormEvent, useState } from 'react'
import { useCuentas, useGastosRefreshState } from '../../contexts'
import { updateMsiGrupo, cambiarCuentaMsiGrupo, type MsiGrupoUndoSnapshot } from '../../services/msiGrupo'
import { updateGastoSimple } from '../../services/gastos/gastos'
import { supabase } from '../../services/supabase'
import { formatCurrency } from '../../utils/format/formatCurrency'
import { parseMontoValue } from '../../utils/format/montoInput'
import { sumMsiGrupoMontos } from '../../utils/gastos/gastoSaldo'
import { toMsiInstallmentUpdates } from '../../utils/gastos/msi'
import { showError, showInfo, showSuccess, showSuccessWithUndo } from '../../utils/core/toast'
import {
  validateDescripcion,
  validateMonto,
  validateMsiMeses,
  validateNombre,
} from '../../utils/core/validation'
import type { EditGastoModalProps } from './types'
import type { useEditGastoForm } from './useEditGastoForm'

type EditGastoFormState = ReturnType<typeof useEditGastoForm>

export function useEditGastoSubmit(
  { gasto, onClose }: Pick<EditGastoModalProps, 'gasto' | 'onClose'>,
  form: EditGastoFormState,
) {
  const { refresh } = useGastosRefreshState()
  const { refreshCuentas } = useCuentas()
  const [guardando, setGuardando] = useState(false)

  const {
    monto,
    categoria,
    descripcion,
    cuentaId,
    corregirTotal,
    totalCompra,
    mesesMsi,
    descripcionBase,
    esMsi,
    gastoPasado,
    edicionBloqueada,
    totalGrupo,
    cuentaCambio,
    previewCuotas,
    grupoRows,
    buildInstallmentsFromGrupo,
    validarCambioCuenta,
  } = form

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

  return { guardando, handleSubmit }
}
