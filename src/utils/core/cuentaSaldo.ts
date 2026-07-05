import type { CuentaTipo } from '../../types/cuenta'
import { roundMoney, sumMoney } from './centavos'

export function calcSaldoAfterGasto(
  tipo: CuentaTipo,
  saldoActual: number,
  monto: number,
): number {
  const delta = tipo === 'credito' ? monto : -monto
  return roundMoney(sumMoney(saldoActual, delta))
}

export function revertSaldoAfterGasto(
  tipo: CuentaTipo,
  saldoActual: number,
  monto: number,
): number {
  const delta = tipo === 'credito' ? -monto : monto
  return roundMoney(sumMoney(saldoActual, delta))
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
