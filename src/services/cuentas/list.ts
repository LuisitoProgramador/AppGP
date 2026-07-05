import type { Cuenta } from '../../types/cuenta'
import { isOnline } from '../../utils/core/network'
import { getPendingCuentas, getPendingGastosCount } from '../sync/offlineQueue'
import { readCache, writeCache } from './cache'
import { fetchCuentasRows, mapCuenta } from './fetch'
import { pendingCuentaToCuenta } from './helpers'
import { migrateLegacyTasaInteres } from './migrateTasaInteres'

async function appendQueuedCuentas(userId: string, cuentas: Cuenta[]): Promise<Cuenta[]> {
  const pending = await getPendingCuentas(userId)
  if (pending.length === 0) return cuentas

  const existingIds = new Set(cuentas.map((cuenta) => cuenta.id))
  const extras = pending
    .filter((item) => !existingIds.has(item.tempCuentaId))
    .map(pendingCuentaToCuenta)

  return extras.length > 0 ? [...cuentas, ...extras] : cuentas
}

export async function listCuentas(
  userId: string,
): Promise<{ data: Cuenta[]; error: string | null; fromCache: boolean }> {
  if (!isOnline()) {
    return { data: readCache(userId), error: null, fromCache: true }
  }

  const pendingGastosCount = await getPendingGastosCount(userId)
  if (pendingGastosCount > 0) {
    const cached = readCache(userId)
    if (cached.length > 0) {
      return { data: cached, error: null, fromCache: true }
    }
  }

  const { data, error } = await fetchCuentasRows(userId)

  if (error) {
    const cached = readCache(userId)
    if (cached.length > 0) {
      return { data: cached, error: null, fromCache: true }
    }
    return { data: [], error: error.message, fromCache: false }
  }

  const cuentas = (data ?? []).map((row) => mapCuenta(row))
  const migrated = await migrateLegacyTasaInteres(userId, cuentas)
  const merged = await appendQueuedCuentas(userId, migrated)
  writeCache(userId, merged)
  return { data: merged, error: null, fromCache: false }
}
