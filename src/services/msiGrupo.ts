import { supabase } from './supabase'
import type { MsiInstallmentUpdate } from '../types/gasto'
import {
  msiGrupoMatchesExpected,
  type MsiGrupoServerState,
} from '../utils/gastos/msiGrupoMatch'

export type { MsiInstallmentUpdate }
export { msiGrupoMatchesExpected }

export interface MsiGrupoUndoSnapshot {
  grupoMsiId: string
  cuentaId: string
  categoria: string
  installments: MsiInstallmentUpdate[]
  totalCompra: number
}

export interface MsiGrupoSaldoParams {
  cuentaAnteriorId?: string | null
  totalAnterior: number
  totalNuevo: number
}

export interface UpdateMsiGrupoParams {
  grupoMsiId: string
  categoria: string
  cuentaId: string
  installments: MsiInstallmentUpdate[]
  idempotencyKey?: string
  saldo?: MsiGrupoSaldoParams
}

export interface UpdateMsiGrupoResult {
  error: string | null
  updatedIds?: number[]
  insertedIds?: number[]
  deletedIds?: number[]
  recoveredFromServer?: boolean
}

const MAX_RPC_ATTEMPTS = 3

function isRetryableRpcError(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('fetch') ||
    lower.includes('network') ||
    lower.includes('timeout') ||
    lower.includes('failed to fetch') ||
    lower.includes('aborted')
  )
}

function parseRpcResult(data: unknown): Pick<UpdateMsiGrupoResult, 'updatedIds' | 'insertedIds' | 'deletedIds'> {
  const result = data as {
    updated_ids?: number[]
    inserted_ids?: number[]
    deleted_ids?: number[]
  } | null

  return {
    updatedIds: result?.updated_ids ?? [],
    insertedIds: result?.inserted_ids ?? [],
    deletedIds: result?.deleted_ids ?? [],
  }
}

export async function fetchMsiGrupoServerState(
  grupoMsiId: string,
): Promise<{ state: MsiGrupoServerState | null; error: string | null }> {
  const { data, error } = await supabase
    .from('gastos')
    .select('monto, descripcion, fecha, categoria, cuenta_id')
    .eq('grupo_msi_id', grupoMsiId)
    .order('fecha', { ascending: true })

  if (error) {
    return { state: null, error: error.message }
  }

  const rows = data ?? []
  if (rows.length === 0) {
    return { state: null, error: 'Grupo MSI no encontrado en el servidor.' }
  }

  return {
    state: {
      categoria: String(rows[0].categoria),
      cuentaId: String(rows[0].cuenta_id ?? ''),
      installments: rows.map((row) => ({
        monto: Number(row.monto),
        descripcion: String(row.descripcion ?? ''),
        fecha: String(row.fecha),
      })),
    },
    error: null,
  }
}

export async function verifyMsiGrupoApplied(
  grupoMsiId: string,
  expected: {
    categoria: string
    cuentaId: string
    installments: MsiInstallmentUpdate[]
  },
): Promise<boolean> {
  const { state, error } = await fetchMsiGrupoServerState(grupoMsiId)
  if (error || !state) return false
  return msiGrupoMatchesExpected(state, expected)
}

async function callUpdateMsiGrupoRpc(
  params: UpdateMsiGrupoParams,
): Promise<UpdateMsiGrupoResult> {
  const saldo = params.saldo
  const cuentaAnteriorId =
    saldo?.cuentaAnteriorId && saldo.cuentaAnteriorId !== params.cuentaId
      ? saldo.cuentaAnteriorId
      : null

  const { data, error } = await supabase.rpc('update_msi_grupo', {
    p_grupo_msi_id: params.grupoMsiId,
    p_categoria: params.categoria,
    p_cuenta_id: params.cuentaId,
    p_installments: params.installments,
    p_idempotency_key: params.idempotencyKey ?? null,
    p_saldo_cuenta_anterior_id: cuentaAnteriorId,
    p_saldo_total_anterior: saldo?.totalAnterior ?? null,
    p_saldo_total_nuevo: saldo?.totalNuevo ?? null,
  })

  if (error) {
    return { error: error.message }
  }

  return {
    error: null,
    ...parseRpcResult(data),
  }
}

export async function cambiarCuentaMsiGrupo(params: {
  grupoMsiId: string
  categoria: string
  cuentaAnteriorId: string
  cuentaNuevaId: string
  installments: MsiInstallmentUpdate[]
  totalCompra: number
  idempotencyKey?: string
}): Promise<UpdateMsiGrupoResult> {
  return updateMsiGrupo({
    grupoMsiId: params.grupoMsiId,
    categoria: params.categoria,
    cuentaId: params.cuentaNuevaId,
    installments: params.installments,
    idempotencyKey: params.idempotencyKey,
    saldo: {
      cuentaAnteriorId: params.cuentaAnteriorId,
      totalAnterior: params.totalCompra,
      totalNuevo: params.totalCompra,
    },
  })
}

export async function updateMsiGrupo(params: UpdateMsiGrupoParams): Promise<UpdateMsiGrupoResult> {
  if (params.installments.length < 2 || params.installments.length > 48) {
    return { error: 'El número de cuotas debe estar entre 2 y 48.' }
  }

  const idempotencyKey = params.idempotencyKey ?? crypto.randomUUID()
  const request = { ...params, idempotencyKey }

  try {
    let lastError: string | null = null

    for (let attempt = 0; attempt < MAX_RPC_ATTEMPTS; attempt++) {
      const result = await callUpdateMsiGrupoRpc(request)
      if (!result.error) {
        return result
      }

      lastError = result.error
      if (!isRetryableRpcError(result.error) || attempt === MAX_RPC_ATTEMPTS - 1) {
        break
      }
    }

    const applied = await verifyMsiGrupoApplied(params.grupoMsiId, {
      categoria: params.categoria,
      cuentaId: params.cuentaId,
      installments: params.installments,
    })

    if (applied) {
      return {
        error: null,
        recoveredFromServer: true,
      }
    }

    return { error: lastError ?? 'Error al actualizar grupo MSI.' }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al actualizar grupo MSI.'

    const applied = await verifyMsiGrupoApplied(params.grupoMsiId, {
      categoria: params.categoria,
      cuentaId: params.cuentaId,
      installments: params.installments,
    })

    if (applied) {
      return {
        error: null,
        recoveredFromServer: true,
      }
    }

    return { error: message }
  }
}
