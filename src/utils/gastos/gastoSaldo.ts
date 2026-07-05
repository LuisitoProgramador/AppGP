import type { GastoInsertFields } from '../../types/gasto'
import { montoParaSaldoCuenta } from '../core/cuentaSaldo'
import { roundMoney, sumMoney } from '../core/centavos'
import { parseMsiDescripcion, splitMsiAmount } from './msi'

/** Monto que se aplicó al saldo de la cuenta al registrar el gasto. */
export function montoSaldoAlRegistrar(
  monto: number,
  esMsi: boolean,
  totalCompra?: number,
): number {
  if (esMsi) {
    return montoParaSaldoCuenta(monto, true, totalCompra ?? monto)
  }
  return monto
}

/** Monto a revertir del saldo al eliminar un gasto pendiente (offline). */
export function montoSaldoAlEliminarPendiente(pending: {
  monto: number
  msiInstallments?: GastoInsertFields[]
}): number {
  const esMsi = Boolean(pending.msiInstallments?.length)
  return montoSaldoAlRegistrar(pending.monto, esMsi, esMsi ? pending.monto : undefined)
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
    total_compra_msi?: number | null
  },
  grupoRows: { id: number; monto: number; total_compra_msi?: number | null }[],
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
  return roundMoney(rows.reduce((sum, row) => sumMoney(sum, Number(row.monto)), 0))
}

/** Total de compra MSI a revertir en crédito (cuando se elimina la última cuota). */
function msiTotalParaRevertir(
  gasto: { monto: number; descripcion?: string | null; total_compra_msi?: number | null },
  grupoRows: { monto: number; total_compra_msi?: number | null }[],
): number {
  const fromColumn =
    gasto.total_compra_msi ??
    grupoRows.find((row) => row.total_compra_msi != null && row.total_compra_msi > 0)
      ?.total_compra_msi

  if (fromColumn != null && fromColumn > 0) {
    return Number(fromColumn)
  }

  if (grupoRows.length > 1) {
    return sumMsiGrupoMontos(grupoRows)
  }

  const parsed = gasto.descripcion ? parseMsiDescripcion(gasto.descripcion) : null
  if (parsed && parsed.total > 1) {
    const inferredTotal = roundMoney(Number(gasto.monto) * parsed.total)
    return sumMsiGrupoMontos(
      splitMsiAmount(inferredTotal, parsed.total).map((monto) => ({ monto })),
    )
  }

  return sumMsiGrupoMontos(grupoRows)
}

/** Delta de saldo de crédito al corregir el total de una compra MSI. */
export function saldoDeltaAlCorregirMsiGrupo(oldTotal: number, newTotal: number): number {
  return roundMoney(sumMoney(newTotal, -oldTotal))
}
