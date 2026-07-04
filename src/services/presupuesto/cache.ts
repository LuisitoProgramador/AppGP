import type { Presupuesto } from './types'

export function limiteLocalStorageKey(userId: string) {
  return `presupuesto_limite_${userId}`
}

function configLocalStorageKey(userId: string) {
  return `presupuesto_config_${userId}`
}

export function cachePresupuesto(userId: string, presupuesto: Presupuesto) {
  try {
    localStorage.setItem(limiteLocalStorageKey(userId), String(presupuesto.limite_mensual))
    localStorage.setItem(configLocalStorageKey(userId), JSON.stringify(presupuesto))
  } catch {
    /* ignore QuotaExceededError and other storage failures */
  }
}

export function readCachedPresupuesto(userId: string): Presupuesto | null {
  try {
    const raw = localStorage.getItem(configLocalStorageKey(userId))
    if (!raw) return null
    return JSON.parse(raw) as Presupuesto
  } catch {
    return null
  }
}
