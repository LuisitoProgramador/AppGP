import { esGastoPresupuestable, type CategoriaResumen } from '../../types/gasto'
import { fromCentavos, toCentavos } from '../core/centavos'

export function agruparPorCategoria(
  gastos: { monto: number; categoria: string }[],
): CategoriaResumen[] {
  const totales = gastos.reduce<{ acc: Record<string, number>; totalCentavos: number }>(
    (state, gasto) => {
      if (!esGastoPresupuestable(gasto.categoria)) return state

      const centavos = toCentavos(Number(gasto.monto))
      state.acc[gasto.categoria] = (state.acc[gasto.categoria] ?? 0) + centavos
      state.totalCentavos += centavos
      return state
    },
    { acc: {}, totalCentavos: 0 },
  )

  const { acc, totalCentavos } = totales

  return Object.entries(acc)
    .map(([categoria, centavos]) => ({
      categoria,
      total: fromCentavos(centavos),
      porcentaje: totalCentavos > 0 ? (centavos / totalCentavos) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)
}
