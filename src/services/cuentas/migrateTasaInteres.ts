import type { Cuenta } from '../../types/cuenta'
import {
  clearLegacyTasaInteresMensual,
  normalizeTasaInteresMensual,
  readLegacyTasaInteresMensual,
} from '../cuentaInteres'
import { supabase } from '../supabase'
import { mapWithConcurrency } from '../../utils/core/concurrency'

const MIGRATION_CONCURRENCY = 4

async function migrateSingleLegacyTasa(
  userId: string,
  cuenta: Cuenta,
): Promise<{ cuentaId: string; tasa: number } | null> {
  const legacy = readLegacyTasaInteresMensual(cuenta.id)
  if (legacy == null) return null

  try {
    const { data, error } = await supabase
      .from('cuentas')
      .update({ tasa_interes_mensual: legacy })
      .eq('id', cuenta.id)
      .eq('user_id', userId)
      .select('tasa_interes_mensual')
      .maybeSingle()

    if (error || !data) return null

    const persisted = normalizeTasaInteresMensual(data.tasa_interes_mensual)
    const expected = normalizeTasaInteresMensual(legacy)
    if (persisted == null || expected == null || persisted !== expected) return null

    clearLegacyTasaInteresMensual(cuenta.id)
    return { cuentaId: cuenta.id, tasa: legacy }
  } catch {
    return null
  }
}

/** Migra tasas guardadas en localStorage a Supabase (una vez por cuenta). */
export async function migrateLegacyTasaInteres(userId: string, cuentas: Cuenta[]): Promise<Cuenta[]> {
  const pending = cuentas.filter(
    (cuenta) =>
      cuenta.tipo === 'credito' &&
      (cuenta.tasa_interes_mensual == null || cuenta.tasa_interes_mensual <= 0),
  )

  if (pending.length === 0) return cuentas

  const results = await mapWithConcurrency(pending, MIGRATION_CONCURRENCY, (cuenta) =>
    migrateSingleLegacyTasa(userId, cuenta),
  )

  const migrated = new Map(
    results
      .filter((result): result is { cuentaId: string; tasa: number } => result != null)
      .map((result) => [result.cuentaId, result.tasa]),
  )

  if (migrated.size === 0) return cuentas

  return cuentas.map((item) => {
    const tasa = migrated.get(item.id)
    return tasa == null ? item : { ...item, tasa_interes_mensual: tasa }
  })
}
