import type { Categoria } from '../types/gasto'
import { getCategoriasUsuario } from './categorias'
import { calcLimitesRegla503020 } from '../utils/finanzas/regla503020'
import { roundMoney } from '../utils/core/centavos'

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
    actuales[categoria] = roundMoney(limite)
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

/** Aplica límites por categoría según regla 50/30/20 sobre el ingreso mensual y el % de ahorro. */
export function aplicarLimitesRegla503020(
  userId: string,
  ingresoMensual: number,
  porcentajeAhorro: number,
): void {
  if (ingresoMensual <= 0) return
  const categorias = getCategoriasUsuario(userId)
  const limites = calcLimitesRegla503020(ingresoMensual, categorias, porcentajeAhorro)
  localStorage.setItem(storageKey(userId), JSON.stringify(limites))
}
