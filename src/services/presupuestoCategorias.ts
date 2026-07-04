import type { Categoria } from '../types/gasto'

export type LimitesPorCategoria = Record<string, number>

function storageKey(userId: string) {
  return `presupuesto_categorias_${userId}`
}

export function getLimitesPorCategoria(userId: string): LimitesPorCategoria {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return {}
    return JSON.parse(raw) as LimitesPorCategoria
  } catch {
    return {}
  }
}

export function setLimiteCategoria(userId: string, categoria: Categoria, limite: number | null): void {
  const actuales = getLimitesPorCategoria(userId)
  if (limite == null || limite <= 0) {
    delete actuales[categoria]
  } else {
    actuales[categoria] = Math.round(limite * 100) / 100
  }
  localStorage.setItem(storageKey(userId), JSON.stringify(actuales))
}

export function getLimiteCategoria(userId: string, categoria: Categoria): number | null {
  const limite = getLimitesPorCategoria(userId)[categoria]
  return limite != null && limite > 0 ? limite : null
}

export interface AlertaCategoria {
  categoria: Categoria
  gastado: number
  limite: number
  porcentaje: number
}

export function calcAlertasCategoria(
  limites: LimitesPorCategoria,
  gastosPorCategoria: Record<string, number>,
  umbral = 0.8,
): AlertaCategoria[] {
  const alertas: AlertaCategoria[] = []

  for (const [categoria, limite] of Object.entries(limites)) {
    if (limite <= 0) continue
    const gastado = gastosPorCategoria[categoria] ?? 0
    const porcentaje = gastado / limite
    if (porcentaje >= umbral) {
      alertas.push({
        categoria,
        gastado,
        limite,
        porcentaje,
      })
    }
  }

  return alertas.sort((a, b) => b.porcentaje - a.porcentaje)
}
