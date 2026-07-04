import type { Gasto } from '../../types/gasto'

export interface GrupoMsiRow {
  id: number
  monto: number
  descripcion: string | null
  fecha: string
  categoria: string
}

export type EditGastoModo = 'cuota' | 'compra'

export interface EditGastoModalProps {
  gasto: Gasto
  onClose: () => void
  modoInicial?: EditGastoModo
}

export const OFFLINE_CUENTA_MSG =
  'La edición de cuentas requiere conexión a internet para sincronizar saldos.'
