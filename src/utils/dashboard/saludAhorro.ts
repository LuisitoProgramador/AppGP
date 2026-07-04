import type { MetaAhorro } from '../../types/metaAhorro'
import { getMetaProgress } from '../finanzas/metaProgress'

export type SaludNivel = 'bajo' | 'medio' | 'alto' | 'excelente'

export interface SaludAhorro {
  porcentaje: number
  nivel: SaludNivel
  mensaje: string
}

function nivelFromPorcentaje(porcentaje: number): SaludNivel {
  if (porcentaje >= 80) return 'excelente'
  if (porcentaje >= 55) return 'alto'
  if (porcentaje >= 30) return 'medio'
  return 'bajo'
}

function mensajeFromNivel(nivel: SaludNivel, tieneMetas: boolean): string {
  switch (nivel) {
    case 'excelente':
      return tieneMetas
        ? '¡Excelente! Vas cumpliendo tus metas de ahorro.'
        : '¡Muy bien! Estás dentro de tu presupuesto mensual.'
    case 'alto':
      return tieneMetas
        ? 'Vas por buen camino con tus metas. Sigue así.'
        : 'Buen control de gastos. Mantén el ritmo.'
    case 'medio':
      return 'Hay margen de mejora. Revisa dónde puedes ajustar.'
    case 'bajo':
      return 'Cuidado: tus gastos están limitando tu capacidad de ahorro.'
  }
}

export function calcularSaludAhorro(params: {
  metas: MetaAhorro[]
  gastoTotal: number
  limiteMensual: number
  disponible: number
}): SaludAhorro {
  const { metas, limiteMensual, disponible, gastoTotal } = params

  let porcentaje: number
  const gastoScore =
    limiteMensual > 0
      ? Math.max(0, Math.min(100, (1 - gastoTotal / limiteMensual) * 100))
      : 0

  if (metas.length > 0) {
    const progresoMetas =
      metas.reduce((sum, meta) => sum + getMetaProgress(meta), 0) / metas.length
    const presupuestoScore =
      limiteMensual > 0 ? Math.max(0, (disponible / limiteMensual) * 100) : 0
    porcentaje = Math.round((progresoMetas + presupuestoScore + gastoScore) / 3)
  } else {
    porcentaje =
      limiteMensual > 0
        ? Math.round(Math.max(0, Math.min(100, (disponible / limiteMensual) * 100)))
        : 0
  }

  const nivel = nivelFromPorcentaje(porcentaje)
  const mensaje = mensajeFromNivel(nivel, metas.length > 0)

  return { porcentaje, nivel, mensaje }
}
