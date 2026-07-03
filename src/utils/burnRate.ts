export function shouldShowBurnRateAlert(
  gastoTotal: number,
  limiteMensual: number,
  diaActual: number,
): boolean {
  if (limiteMensual <= 0) return false
  const porcentajeGastado = gastoTotal / limiteMensual
  return porcentajeGastado > 0.8 && diaActual < 15
}
