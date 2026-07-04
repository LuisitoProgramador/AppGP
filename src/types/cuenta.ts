export type CuentaTipo = 'efectivo' | 'debito' | 'credito'

export interface Cuenta {
  id: string
  nombre: string
  tipo: CuentaTipo
  limite_credito: number | null
  saldo_actual: number
  dia_corte: number | null
  dia_pago: number | null
}

export interface CuentaInput {
  nombre: string
  tipo: CuentaTipo
  limite_credito?: number | null
  saldo_actual?: number
  dia_corte?: number | null
  dia_pago?: number | null
}

export interface PendingCuenta {
  id: string
  tempCuentaId: string
  userId: string
  nombre: string
  tipo: CuentaTipo
  limite_credito: number | null
  saldo_actual: number
  dia_corte: number | null
  dia_pago: number | null
  createdAt: number
  retryCount: number
}

export const CUENTA_TIPOS: { value: CuentaTipo; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' },
]
