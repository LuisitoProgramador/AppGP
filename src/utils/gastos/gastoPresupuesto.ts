import { esGastoPresupuestable } from '../../types/gasto'
import { fromCentavos, toCentavos } from '../core/centavos'

interface GastoConCategoria {
  categoria: string
  monto?: number
  total?: number
}

/** Suma montos excluyendo transferencias internas. */
export function sumGastosPresupuestables(rows: GastoConCategoria[]): number {
  const centavos = rows.reduce((acc, row) => {
    if (!esGastoPresupuestable(row.categoria)) return acc
    const monto = row.total ?? row.monto ?? 0
    return acc + toCentavos(Number(monto))
  }, 0)
  return fromCentavos(centavos)
}

/** Filtra líneas de gasto reales (no transferencias). */
export function filterGastosPresupuestables<T extends GastoConCategoria>(rows: T[]): T[] {
  return rows.filter((row) => esGastoPresupuestable(row.categoria))
}
