export const PORCENTAJE_AHORRO_MIN = 5
export const PORCENTAJE_AHORRO_MAX = 50
export const PORCENTAJE_AHORRO_STEP = 5
export const PORCENTAJE_AHORRO_DEFAULT = 20

export function validatePorcentajeAhorro(value: number): string | null {
  if (
    !Number.isInteger(value) ||
    value < PORCENTAJE_AHORRO_MIN ||
    value > PORCENTAJE_AHORRO_MAX
  ) {
    return `El porcentaje de ahorro debe estar entre ${PORCENTAJE_AHORRO_MIN}% y ${PORCENTAJE_AHORRO_MAX}%.`
  }
  if (value % PORCENTAJE_AHORRO_STEP !== 0) {
    return `El porcentaje de ahorro debe ser múltiplo de ${PORCENTAJE_AHORRO_STEP}.`
  }
  return null
}
