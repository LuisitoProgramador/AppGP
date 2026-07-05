import type { GastoRecurrente } from '../../types/gasto'
import { esGastoPresupuestable } from '../../types/gasto'
import { getCalendarDay, getYearMonthKey } from '../date'
import { roundMoney } from '../core/centavos'

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
  return getYearMonthKey(new Date(fecha))
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
    if (!esGastoPresupuestable(gasto.categoria)) continue
    const key = normalizeDescripcion(gasto.descripcion)
    if (!key || recurrentesKeys.has(key)) continue

    const monto = roundMoney(Number(gasto.monto))
    const diaMes = getCalendarDay(gasto.fecha)
    const mes = monthKey(gasto.fecha)
    const existing = groups.get(key)

    if (!existing) {
      groups.set(key, {
        descripcion: gasto.descripcion.trim(),
        categoria: gasto.categoria,
        monto,
        meses: new Set([mes]),
        dias: [diaMes],
      })
      continue
    }

    if (!montosSimilares(existing.monto, monto)) continue

    existing.meses.add(mes)
    existing.dias.push(diaMes)
  }

  const sugeridos: RecurrenteSugerido[] = []

  for (const group of groups.values()) {
    if (group.meses.size < 3) continue

    const dayCounts = new Map<number, number>()
    for (const dia of group.dias) {
      dayCounts.set(dia, (dayCounts.get(dia) ?? 0) + 1)
    }
    let diaFrecuente = 1
    let maxCount = 0
    for (const [dia, count] of dayCounts) {
      if (count > maxCount) {
        maxCount = count
        diaFrecuente = dia
      }
    }

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
