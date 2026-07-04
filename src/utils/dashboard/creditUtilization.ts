import type { Cuenta } from '../../types/cuenta'

export function getCreditUtilization(cuenta: Cuenta): number | null {
  if (cuenta.tipo !== 'credito') return null
  if (cuenta.limite_credito == null || cuenta.limite_credito <= 0) return null
  return Math.round((cuenta.saldo_actual / cuenta.limite_credito) * 100)
}

export function utilizationColor(pct: number): string {
  if (pct >= 80) return 'text-pulso-warning'
  if (pct >= 50) return 'text-pulso-accent-muted'
  return 'text-slate-400'
}
