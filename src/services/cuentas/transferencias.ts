import { isOnline, offlineServiceError } from '../../utils/core/network'
import { supabase } from '../supabase'
import { listCuentas } from './list'

export async function realizarTransferencia(
  userId: string,
  origenId: string,
  destinoId: string,
  monto: number,
): Promise<{ error: string | null }> {
  if (!isOnline()) {
    return offlineServiceError('Sin conexión. Conéctate para realizar una transferencia.')
  }

  if (monto <= 0) {
    return { error: 'El monto debe ser mayor a 0.' }
  }

  const { error } = await supabase.rpc('realizar_transferencia', {
    p_origen_id: origenId,
    p_destino_id: destinoId,
    p_monto: monto,
  })

  if (error) return { error: error.message }

  await listCuentas(userId)

  return { error: null }
}
