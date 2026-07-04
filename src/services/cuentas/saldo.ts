import type { Cuenta } from '../../types/cuenta'
import { calcSaldoAfterGasto, revertSaldoAfterGasto } from '../../utils/core/cuentaSaldo'
import { isOnline } from '../../utils/core/network'
import { supabase } from '../supabase'
import { writeCache } from './cache'

export function applyGastoSaldoLocal(
  userId: string,
  cuentas: Cuenta[],
  cuentaId: string,
  monto: number,
): { cuentas: Cuenta[]; error: string | null } {
  let found = false
  const updated = cuentas.map((c) => {
    if (c.id !== cuentaId) return c
    found = true
    const newSaldo = calcSaldoAfterGasto(c.tipo, c.saldo_actual, monto)
    return { ...c, saldo_actual: newSaldo }
  })
  if (!found) return { cuentas, error: 'Cuenta no encontrada' }

  writeCache(userId, updated)
  return { cuentas: updated, error: null }
}

export function applyIngresoSaldoLocal(
  userId: string,
  cuentas: Cuenta[],
  cuentaId: string,
  monto: number,
): { cuentas: Cuenta[]; error: string | null } {
  let found = false
  const updated = cuentas.map((c) => {
    if (c.id !== cuentaId) return c
    found = true
    if (c.tipo === 'credito') {
      return c
    }
    const newSaldo = revertSaldoAfterGasto(c.tipo, c.saldo_actual, monto)
    return { ...c, saldo_actual: newSaldo }
  })
  if (!found) return { cuentas, error: 'Cuenta no encontrada' }
  const cuenta = updated.find((c) => c.id === cuentaId)
  if (cuenta?.tipo === 'credito') {
    return { cuentas, error: 'Los ingresos solo se registran en cuentas de efectivo o débito.' }
  }

  writeCache(userId, updated)
  return { cuentas: updated, error: null }
}

export function revertIngresoSaldoLocal(
  userId: string,
  cuentas: Cuenta[],
  cuentaId: string,
  monto: number,
): Cuenta[] {
  const { cuentas: updated } = applyGastoSaldoLocal(userId, cuentas, cuentaId, monto)
  return updated
}

export async function persistCuentaSaldo(
  userId: string,
  cuentaId: string,
  saldoActual: number,
): Promise<{ error: string | null }> {
  if (!isOnline()) return { error: null }

  const { error } = await supabase
    .from('cuentas')
    .update({ saldo_actual: saldoActual })
    .eq('id', cuentaId)
    .eq('user_id', userId)

  return { error: error?.message ?? null }
}

export async function applyGastoToCuenta(
  userId: string,
  cuentas: Cuenta[],
  cuentaId: string,
  monto: number,
): Promise<{ cuentas: Cuenta[]; error: string | null }> {
  const { cuentas: updated, error: localError } = applyGastoSaldoLocal(
    userId,
    cuentas,
    cuentaId,
    monto,
  )
  if (localError) return { cuentas, error: localError }

  const cuenta = updated.find((c) => c.id === cuentaId)
  if (!cuenta) return { cuentas, error: 'Cuenta no encontrada' }

  const { error: persistError } = await persistCuentaSaldo(
    userId,
    cuentaId,
    cuenta.saldo_actual,
  )
  if (persistError) {
    writeCache(userId, cuentas)
    return { cuentas, error: persistError }
  }

  return { cuentas: updated, error: null }
}

export function revertGastoSaldoLocal(
  userId: string,
  cuentas: Cuenta[],
  cuentaId: string,
  monto: number,
): Cuenta[] {
  let found = false
  const updated = cuentas.map((c) => {
    if (c.id !== cuentaId) return c
    found = true
    const newSaldo = revertSaldoAfterGasto(c.tipo, c.saldo_actual, monto)
    return { ...c, saldo_actual: newSaldo }
  })
  if (!found) return cuentas

  writeCache(userId, updated)
  return updated
}
