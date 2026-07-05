import type { Cuenta } from '../../types/cuenta'
import { clearLegacyTasaInteresMensual, readLegacyTasaInteresMensual } from '../cuentaInteres'
import { supabase } from '../supabase'

/** Migra tasas guardadas en localStorage a Supabase (una vez por cuenta). */
export async function migrateLegacyTasaInteres(userId: string, cuentas: Cuenta[]): Promise<Cuenta[]> {
  const pending = cuentas.filter(
    (cuenta) =>
      cuenta.tipo === 'credito' &&
      (cuenta.tasa_interes_mensual == null || cuenta.tasa_interes_mensual <= 0),
  )

  if (pending.length === 0) return cuentas

  let updated = cuentas

  for (const cuenta of pending) {
    const legacy = readLegacyTasaInteresMensual(cuenta.id)
    if (legacy == null) continue

    const { error } = await supabase
      .from('cuentas')
      .update({ tasa_interes_mensual: legacy })
      .eq('id', cuenta.id)
      .eq('user_id', userId)

    if (error) continue

    clearLegacyTasaInteresMensual(cuenta.id)
    updated = updated.map((item) =>
      item.id === cuenta.id ? { ...item, tasa_interes_mensual: legacy } : item,
    )
  }

  return updated
}
