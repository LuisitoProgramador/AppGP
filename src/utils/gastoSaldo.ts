import type { GastoInsertFields } from '../types/gasto'
import { montoParaSaldoCuenta } from './cuentaSaldo'
import { parseMsiDescripcion, splitMsiAmount } from './msi'

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
    descripcion?: string | null
    cuenta_id?: string | null
    es_msi?: boolean
    grupo_msi_id?: string | null
  },
  grupoRows: { id: number; monto: number }[],
): SaldoRevertAlEliminar | null {
  if (!gasto.cuenta_id) return null

  if (gasto.es_msi) {
    const siblings = grupoRows.filter((row) => row.id !== gasto.id)
    if (siblings.length > 0) return null

    return {
      cuentaId: gasto.cuenta_id,
      monto: msiTotalParaRevertir(gasto, grupoRows),
    }
  }

  return { cuentaId: gasto.cuenta_id, monto: Number(gasto.monto) }
}

export function sumMsiGrupoMontos(rows: { monto: number }[]): number {
  return Math.round(rows.reduce((sum, row) => sum + Number(row.monto), 0) * 100) / 100
}

/** Total de compra MSI a revertir en crédito (cuando se elimina la última cuota). */
function msiTotalParaRevertir(
  gasto: { monto: number; descripcion?: string | null },
  grupoRows: { monto: number }[],
): number {
  if (grupoRows.length > 1) {
    return sumMsiGrupoMontos(grupoRows)
  }

  const parsed = gasto.descripcion ? parseMsiDescripcion(gasto.descripcion) : null
  if (parsed && parsed.total > 1) {
    const inferredTotal = Math.round(Number(gasto.monto) * parsed.total * 100) / 100
    return sumMsiGrupoMontos(
      splitMsiAmount(inferredTotal, parsed.total).map((monto) => ({ monto })),
    )
  }

  return sumMsiGrupoMontos(grupoRows)
}

/** Delta de saldo de crédito al corregir el total de una compra MSI. */
export function saldoDeltaAlCorregirMsiGrupo(oldTotal: number, newTotal: number): number {
  return Math.round((newTotal - oldTotal) * 100) / 100
}
