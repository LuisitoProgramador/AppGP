import type { Cuenta } from '../../types/cuenta'
import { roundMoney, sumMoney } from '../core/centavos'

export function calcPatrimonioLiquido(cuentas: Cuenta[]): number {
  const montos = cuentas
    .filter((c) => c.tipo === 'efectivo' || c.tipo === 'debito')
    .map((c) => Math.max(0, c.saldo_actual))

  return roundMoney(sumMoney(...montos))
}
