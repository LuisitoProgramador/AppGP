import { supabase } from '../supabase'

export interface UpdateGastoSimpleParams {
  gastoId: number
  monto: number
  categoria: string
  descripcion: string
  cuentaId: string | null
}

export async function updateGastoSimple(
  params: UpdateGastoSimpleParams,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('update_gasto_simple', {
    p_gasto_id: params.gastoId,
    p_monto: params.monto,
    p_categoria: params.categoria,
    p_descripcion: params.descripcion,
    p_cuenta_id: params.cuentaId,
  })

  if (error) return { error: error.message }
  return { error: null }
}
