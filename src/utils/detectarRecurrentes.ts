import type { GastoRecurrente } from '../types/gasto'

export interface RecurrenteSugerido {
  descripcion: string
  monto: number
  categoria: string
  dia_mes: number
}

interface GastoPatronRow {
  descripcion: string
  monto: number
  categoria: string
  fecha: string
}

function normalizeDescripcion(value: string): string {
  return value.trim().toLowerCase()
}

function monthKey(fecha: string): string {
  const date = new Date(fecha)
  return `${date.getFullYear()}-${date.getMonth()}`
}

function montosSimilares(a: number, b: number): boolean {
  const base = Math.max(a, b, 1)
  return Math.abs(a - b) / base <= 0.05
}

export function detectarRecurrentesSugeridos(
  gastos: GastoPatronRow[],
  recurrentesExistentes: GastoRecurrente[],
): RecurrenteSugerido[] {
  const recurrentesKeys = new Set(
    recurrentesExistentes.map((item) => normalizeDescripcion(item.descripcion)),
  )

  const groups = new Map<
    string,
    {
      descripcion: string
      categoria: string
      monto: number
      meses: Set<string>
      dias: number[]
    }
  >()

  for (const gasto of gastos) {
    const key = normalizeDescripcion(gasto.descripcion)
    if (!key || recurrentesKeys.has(key)) continue

    const monto = Math.round(Number(gasto.monto) * 100) / 100
    const existing = groups.get(key)

    if (!existing) {
      groups.set(key, {
        descripcion: gasto.descripcion.trim(),
        categoria: gasto.categoria,
        monto,
        meses: new Set([monthKey(gasto.fecha)]),
        dias: [new Date(gasto.fecha).getDate()],
      })
      continue
    }

    if (!montosSimilares(existing.monto, monto)) continue

    existing.meses.add(monthKey(gasto.fecha))
    existing.dias.push(new Date(gasto.fecha).getDate())
  }

  const sugeridos: RecurrenteSugerido[] = []

  for (const group of groups.values()) {
    if (group.meses.size < 3) continue

    const diaFrecuente = [...group.dias].sort(
      (a, b) =>
        group.dias.filter((dia) => dia === b).length -
        group.dias.filter((dia) => dia === a).length,
    )[0]

    sugeridos.push({
      descripcion: group.descripcion,
      monto: group.monto,
      categoria: group.categoria,
      dia_mes: diaFrecuente ?? 1,
    })
  }

  return sugeridos.slice(0, 3)
}

export function dismissRecurrenteSugerido(descripcion: string): void {
  try {
    sessionStorage.setItem(`dismiss-recurrente-${normalizeDescripcion(descripcion)}`, '1')
  } catch {
    // ignore
  }
}

export function isRecurrenteSugeridoDismissed(descripcion: string): boolean {
  try {
    return sessionStorage.getItem(`dismiss-recurrente-${normalizeDescripcion(descripcion)}`) === '1'
  } catch {
    return false
  }
}
