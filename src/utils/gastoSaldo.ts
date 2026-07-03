import type { GastoInsertFields } from '../types/gasto'
import { montoParaSaldoCuenta } from './cuentaSaldo'

/** Monto que se aplicó al saldo de la cuenta al registrar el gasto. */
export function montoSaldoAlRegistrar(monto: number, esMsi: boolean): number {
  return montoParaSaldoCuenta(monto, esMsi, monto)
}

/** Monto a revertir del saldo al eliminar un gasto pendiente (offline). */
export function montoSaldoAlEliminarPendiente(pending: {
  monto: number
  msiInstallments?: GastoInsertFields[]
}): number {
  return montoSaldoAlRegistrar(pending.monto, Boolean(pending.msiInstallments?.length))
}

export interface SaldoRevertAlEliminar {
  cuentaId: string
  monto: number
}

/** Calcula si hay que revertir saldo al borrar un gasto ya sincronizado. */
export function saldoRevertAlEliminar(
  gasto: {
    id: number
    monto: number
    cuenta_id?: string | null
    es_msi?: boolean
    grupo_msi_id?: string | null
  },
  grupoRows: { id: number; monto: number }[],
): SaldoRevertAlEliminar | null {
  if (!gasto.cuenta_id) return null

  if (gasto.es_msi && gasto.grupo_msi_id) {
    const siblings = grupoRows.filter((row) => row.id !== gasto.id)
    if (siblings.length > 0) return null

    const totalGrupo = grupoRows.reduce((sum, row) => sum + Number(row.monto), 0)
    return { cuentaId: gasto.cuenta_id, monto: totalGrupo }
  }

  return { cuentaId: gasto.cuenta_id, monto: Number(gasto.monto) }
}
