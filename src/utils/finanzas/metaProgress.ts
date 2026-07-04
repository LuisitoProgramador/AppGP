import type { MetaAhorro } from '../../types/metaAhorro'

export function getMetaProgress(meta: MetaAhorro): number {
  if (meta.monto_objetivo <= 0) return 0
  return Math.min(100, (meta.monto_actual / meta.monto_objetivo) * 100)
}
