import { supabase } from './supabase'
import type { MsiInstallmentUpdate } from '../types/gasto'

export type { MsiInstallmentUpdate }

export interface MsiGrupoUndoSnapshot {
  grupoMsiId: string
  cuentaId: string
  categoria: string
  installments: MsiInstallmentUpdate[]
  totalCompra: number
}

export interface UpdateMsiGrupoResult {
  error: string | null
  updatedIds?: number[]
  insertedIds?: number[]
  deletedIds?: number[]
}

export async function updateMsiGrupo(params: {
  grupoMsiId: string
  categoria: string
  cuentaId: string
  installments: MsiInstallmentUpdate[]
}): Promise<UpdateMsiGrupoResult> {
  if (params.installments.length < 2 || params.installments.length > 48) {
    return { error: 'El número de cuotas debe estar entre 2 y 48.' }
  }

  try {
    const { data, error } = await supabase.rpc('update_msi_grupo', {
      p_grupo_msi_id: params.grupoMsiId,
      p_categoria: params.categoria,
      p_cuenta_id: params.cuentaId,
      p_installments: params.installments,
    })

    if (error) {
      return { error: error.message }
    }

    const result = data as {
      updated_ids?: number[]
      inserted_ids?: number[]
      deleted_ids?: number[]
    } | null

    return {
      error: null,
      updatedIds: result?.updated_ids ?? [],
      insertedIds: result?.inserted_ids ?? [],
      deletedIds: result?.deleted_ids ?? [],
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al actualizar grupo MSI.'
    return { error: message }
  }
}
