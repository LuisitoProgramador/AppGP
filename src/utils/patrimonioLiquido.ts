import type { Cuenta } from '../types/cuenta'

export function calcPatrimonioLiquido(cuentas: Cuenta[]): number {
  const total = cuentas
    .filter((c) => c.tipo === 'efectivo' || c.tipo === 'debito')
    .reduce((sum, c) => sum + Math.max(0, c.saldo_actual), 0)

  return Math.round(total * 100) / 100
}
