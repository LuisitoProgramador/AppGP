import type { CuentaTipo } from '../../types/cuenta'

export function calcSaldoAfterGasto(
  tipo: CuentaTipo,
  saldoActual: number,
  monto: number,
): number {
  const delta = tipo === 'credito' ? monto : -monto
  return Math.round((saldoActual + delta) * 100) / 100
}

export function revertSaldoAfterGasto(
  tipo: CuentaTipo,
  saldoActual: number,
  monto: number,
): number {
  const delta = tipo === 'credito' ? -monto : monto
  return Math.round((saldoActual + delta) * 100) / 100
}

/** Monto que afecta el saldo de la cuenta al registrar un gasto. */
export function montoParaSaldoCuenta(
  montoGasto: number,
  esMsi: boolean,
  totalMsi?: number,
): number {
  if (esMsi && totalMsi != null) return totalMsi
  return montoGasto
}
