/** Limpia caches en localStorage asociados a un usuario (logout / cambio de sesión). */
export function clearLocalCachesForUser(userId: string): void {
  const suffixes = [
    `cuentas_${userId}`,
    `presupuesto_${userId}`,
    `presupuesto_limite_${userId}`,
    `presupuesto_config_${userId}`,
    `presupuesto_categorias_${userId}`,
    `categorias_${userId}`,
    `registro_prefs_${userId}`,
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
