import type { Cuenta } from '../../types/cuenta'

function cacheKey(userId: string) {
  return `cuentas_${userId}`
}

export function readCache(userId: string): Cuenta[] {
  try {
    const raw = localStorage.getItem(cacheKey(userId))
    if (!raw) return []
    return (JSON.parse(raw) as Cuenta[]).map((cuenta) => ({
      ...cuenta,
      tasa_interes_mensual: cuenta.tasa_interes_mensual ?? null,
    }))
  } catch {
    return []
  }
}

export function writeCache(userId: string, cuentas: Cuenta[]) {
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(cuentas))
  } catch {
    /* ignore QuotaExceededError and other storage failures */
  }
}

export function appendToCache(userId: string, item: Cuenta): void {
  const cached = readCache(userId)
  writeCache(userId, [...cached, item])
}
