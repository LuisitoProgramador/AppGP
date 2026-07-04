import type { Categoria } from '../../types/gasto'

export type RecurrentesFormState = {
  descripcion: string
  monto: string
  categoria: Categoria
  dia_mes: string
  cuentaId: string
}

export const initialForm: RecurrentesFormState = {
  descripcion: '',
  monto: '',
  categoria: 'Otros',
  dia_mes: '1',
  cuentaId: '',
}

export function cuentaLabel(
  cuentas: { id: string; nombre: string }[],
  cuentaId: string | null,
): string {
  if (!cuentaId) return 'Cuenta predeterminada'
  return cuentas.find((c) => c.id === cuentaId)?.nombre ?? 'Cuenta asignada'
}
