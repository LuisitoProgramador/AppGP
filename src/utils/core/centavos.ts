/** Tolerancia para comparar montos en pesos (p. ej. numeric de Postgres con decimales extra). */
export const MONEY_EPSILON = 0.001

/** Convierte pesos a centavos enteros. */
export function toCentavos(monto: number): number {
  return Math.round(monto * 100)
}

/** Convierte centavos enteros a pesos para la UI. */
export function fromCentavos(centavos: number): number {
  return centavos / 100
}

/** Redondea un monto en pesos a 2 decimales operando en centavos. */
export function roundMoney(monto: number): number {
  return fromCentavos(toCentavos(monto))
}

/** Suma montos en pesos sin pérdida de precisión intermedia. */
export function sumMoney(...montos: number[]): number {
  return fromCentavos(montos.reduce((acc, m) => acc + toCentavos(m), 0))
}

/** Compara montos con tolerancia (epsilon). */
export function moneyEquals(a: number, b: number, epsilon = MONEY_EPSILON): boolean {
  return Math.abs(a - b) <= epsilon
}
