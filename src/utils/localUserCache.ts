/** Limpia caches en localStorage asociados a un usuario (logout / cambio de sesión). */
export function clearLocalCachesForUser(userId: string): void {
  const suffixes = [
    `cuentas_${userId}`,
    `presupuesto_${userId}`,
    `merchant_memory_${userId}`,
    `metas_ahorro_${userId}`,
    `metas_ahorro_pending_${userId}`,
  ]

  for (const key of suffixes) {
    try {
      localStorage.removeItem(key)
    } catch {
      /* ignore */
    }
  }
}
