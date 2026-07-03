import type { CategoriaResumen } from '../types/gasto'

export function agruparPorCategoria(
  gastos: { monto: number; categoria: string }[],
): CategoriaResumen[] {
  const totales = gastos.reduce<Record<string, number>>((acc, gasto) => {
    const monto = Number(gasto.monto)
    acc[gasto.categoria] = (acc[gasto.categoria] ?? 0) + monto
    return acc
  }, {})

  const totalGeneral = Object.values(totales).reduce((sum, monto) => sum + monto, 0)

  return Object.entries(totales)
    .map(([categoria, total]) => ({
      categoria,
      total,
      porcentaje: totalGeneral > 0 ? (total / totalGeneral) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)
}
