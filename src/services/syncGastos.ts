import { supabase } from './supabase'
import { getPendingGastos, removePendingGasto } from './offlineQueue'

export async function syncPendingGastos(): Promise<number> {
  const pending = await getPendingGastos()
  let synced = 0

  for (const gasto of pending) {
    const { error } = await supabase.from('gastos').insert({
      monto: gasto.monto,
      categoria: gasto.categoria,
      descripcion: gasto.descripcion,
      fecha: gasto.fecha,
    })

    if (error) continue

    await removePendingGasto(gasto.id)
    synced += 1
  }

  return synced
}
