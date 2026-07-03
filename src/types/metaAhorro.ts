export interface MetaAhorro {
  id: number
  nombre: string
  monto_objetivo: number
  monto_actual: number
  fecha_limite: string | null
}

export interface MetaAhorroInput {
  nombre: string
  monto_objetivo: number
  fecha_limite?: string | null
}

export interface PendingMetaAhorroUpdate {
  id: string
  metaId: number
  amount: number
  createdAt: number
}
