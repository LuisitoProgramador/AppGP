export type CorteEstado = 'proximo' | 'mejor_momento'

function effectiveDay(diaCorte: number, year: number, month: number): number {
  const lastDay = new Date(year, month + 1, 0).getDate()
  return Math.min(diaCorte, lastDay)
}

export function getCorteEstado(
  diaCorte: number | null | undefined,
  hoy: Date = new Date(),
): CorteEstado | null {
  if (diaCorte == null || diaCorte < 1 || diaCorte > 31) return null

  const year = hoy.getFullYear()
  const month = hoy.getMonth()
  const diaActual = hoy.getDate()
  const corteEfectivo = effectiveDay(diaCorte, year, month)

  const diasDespuesCorte = diaActual - corteEfectivo
  if (diasDespuesCorte >= 1 && diasDespuesCorte <= 2) {
    return 'mejor_momento'
  }

  const diasHastaCorte = corteEfectivo - diaActual
  if (diasHastaCorte >= 0 && diasHastaCorte <= 3) {
    return 'proximo'
  }

  return null
}
