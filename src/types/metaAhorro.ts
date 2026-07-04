export interface MetaAhorro {
  id: number
  nombre: string
  monto_objetivo: number
  monto_actual: number
  fecha_limite: string | null
  created_at?: string | null
}

export type MetaAhorroInput = Pick<MetaAhorro, 'nombre' | 'monto_objetivo'> & {
  fecha_limite?: string | null
}

export interface PendingMetaAhorroUpdate {
  id: string
  metaId: number
  amount: number
  createdAt: number
  retryCount?: number
}
