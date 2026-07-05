/** Tasa de interés mensual por tarjeta (persistida en Supabase, columna cuentas.tasa_interes_mensual). */

function legacyStorageKey(cuentaId: string): string {
  return `cuenta_tasa_interes_${cuentaId}`
}

/** Lee tasa legacy de localStorage (migración one-shot). */
export function readLegacyTasaInteresMensual(cuentaId: string): number | null {
  try {
    const raw = localStorage.getItem(legacyStorageKey(cuentaId))
    if (!raw) return null
    const value = Number(raw)
    return Number.isFinite(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

export function clearLegacyTasaInteresMensual(cuentaId: string): void {
  try {
    localStorage.removeItem(legacyStorageKey(cuentaId))
  } catch {
    /* ignore */
  }
}

export function getTasaInteresMensual(cuenta: { id: string; tasa_interes_mensual?: number | null }): number | null {
  if (cuenta.tasa_interes_mensual != null && cuenta.tasa_interes_mensual > 0) {
    return cuenta.tasa_interes_mensual
  }
  return readLegacyTasaInteresMensual(cuenta.id)
}

export function calcInteresEstimado(saldoDeuda: number, tasaMensual: number | null): number | null {
  if (tasaMensual == null || saldoDeuda <= 0) return null
  return Math.round(saldoDeuda * (tasaMensual / 100) * 100) / 100
}

export function normalizeTasaInteresMensual(tasa: number | null | undefined): number | null {
  if (tasa == null || tasa <= 0) return null
  return Math.round(tasa * 10000) / 10000
}
