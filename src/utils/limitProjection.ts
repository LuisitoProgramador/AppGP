export function proyectarDiaAgotamiento(
  gastoTotal: number,
  limiteMensual: number,
  diaActual: number,
): number | null {
  if (limiteMensual <= 0 || diaActual <= 0 || gastoTotal <= 0) return null
  if (gastoTotal >= limiteMensual) return null

  const ritmoDiario = gastoTotal / diaActual
  if (ritmoDiario <= 0) return null

  const diasRestantesHastaAgotar = (limiteMensual - gastoTotal) / ritmoDiario
  const diaProyectado = Math.ceil(diaActual + diasRestantesHastaAgotar)

  const ultimoDiaMes = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    0,
  ).getDate()

  if (diaProyectado <= diaActual || diaProyectado > ultimoDiaMes) return null
  return diaProyectado
}
