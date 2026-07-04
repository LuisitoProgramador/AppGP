/** Tasa de interés mensual opcional por tarjeta (app personal, local). */

function storageKey(cuentaId: string) {
  return `cuenta_tasa_interes_${cuentaId}`
}

export function getTasaInteresMensual(cuentaId: string): number | null {
  try {
    const raw = localStorage.getItem(storageKey(cuentaId))
    if (!raw) return null
    const value = Number(raw)
    return Number.isFinite(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

export function setTasaInteresMensual(cuentaId: string, tasa: number | null): void {
  if (tasa == null || tasa <= 0) {
    localStorage.removeItem(storageKey(cuentaId))
    return
  }
  localStorage.setItem(storageKey(cuentaId), String(Math.round(tasa * 10000) / 10000))
}

export function calcInteresEstimado(saldoDeuda: number, tasaMensual: number | null): number | null {
  if (tasaMensual == null || saldoDeuda <= 0) return null
  return Math.round(saldoDeuda * (tasaMensual / 100) * 100) / 100
}
