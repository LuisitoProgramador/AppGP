export interface ProyeccionCierreResult {
  saldoProyectado: number
  enNegativo: boolean
  ritmoDiario: number
}

export function calcProyeccionCierre(params: {
  limiteMensual: number
  gastoTotal: number
  diaActual: number
  diasRestantes: number
}): ProyeccionCierreResult | null {
  const { limiteMensual, gastoTotal, diaActual, diasRestantes } = params
  if (diaActual <= 0 || limiteMensual <= 0) return null

  const ritmoDiario = gastoTotal / diaActual
  const gastoProyectado = gastoTotal + ritmoDiario * diasRestantes
  const saldoProyectado = limiteMensual - gastoProyectado

  return {
    saldoProyectado,
    enNegativo: saldoProyectado < 0,
    ritmoDiario,
  }
}
