export interface PendingIngreso {
  id: string
  userId: string
  cuenta_id: string
  monto: number
  descripcion: string
  createdAt: number
  retryCount: number
}
