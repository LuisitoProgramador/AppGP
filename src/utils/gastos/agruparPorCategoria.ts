import type { CategoriaResumen } from '../../types/gasto'

export function agruparPorCategoria(
  gastos: { monto: number; categoria: string }[],
): CategoriaResumen[] {
  const totales = gastos.reduce<{ acc: Record<string, number>; totalGeneral: number }>(
    (state, gasto) => {
      const monto = Number(gasto.monto)
      state.acc[gasto.categoria] = (state.acc[gasto.categoria] ?? 0) + monto
      state.totalGeneral += monto
      return state
    },
    { acc: {}, totalGeneral: 0 },
  )

  const { acc, totalGeneral } = totales

  return Object.entries(acc)
    .map(([categoria, total]) => ({
      categoria,
      total,
      porcentaje: totalGeneral > 0 ? (total / totalGeneral) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)
}
