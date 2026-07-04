import type { Cuenta, PendingCuenta } from '../../types/cuenta'
import { readCache, writeCache } from './cache'

export function getCachedCuentas(userId: string): Cuenta[] {
  return readCache(userId)
}

export function setCachedCuentas(userId: string, cuentas: Cuenta[]) {
  writeCache(userId, cuentas)
}

export function resolveCuentasBase(userId: string, fallback: Cuenta[]): Cuenta[] {
  const cached = readCache(userId)
  return cached.length > 0 ? cached : fallback
}

export function pendingCuentaToCuenta(item: PendingCuenta): Cuenta {
  return {
    id: item.tempCuentaId,
    nombre: item.nombre,
    tipo: item.tipo,
    limite_credito: item.limite_credito,
    saldo_actual: item.saldo_actual,
    dia_corte: item.dia_corte,
    dia_pago: item.dia_pago,
  }
}

export function getDefaultCuentaId(cuentas: Cuenta[]): string | null {
  if (cuentas.length === 0) return null
  const preferred = cuentas.find((c) => c.tipo === 'efectivo' || c.tipo === 'debito')
  return preferred?.id ?? cuentas[0].id
}
