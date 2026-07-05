import { CATEGORIAS_DEFAULT } from '../types/gasto'

/** Proporciones clásicas 50/30/20 sobre el gasto disponible (no sobre el ingreso total). */
export const REGLA_503020 = {
  necesidades: 0.5,
  caprichos: 0.3,
  ahorro: 0.2,
} as const

/** Reparto del (100% − ahorro%): necesidades = disponible × 0.625, caprichos = disponible × 0.375. */
export const BUCKET_SHARE_GASTO_DISPONIBLE = {
  necesidades: 0.625,
  caprichos: 0.375,
} as const

export type Bucket503020 = 'necesidades' | 'caprichos'

/** Etiqueta base; el porcentaje real depende del ahorro del usuario (ver getBucketLabel503020). */
export const BUCKET_LABELS: Record<Bucket503020, string> = {
  necesidades: 'Necesidades',
  caprichos: 'Caprichos',
}

/** Reparto de cada categoría base dentro de su bucket (suma 1 por bucket). */
export const CATEGORIA_PESO_EN_BUCKET: Record<(typeof CATEGORIAS_DEFAULT)[number], number> = {
  Comida: 0.35,
  Transporte: 0.25,
  Casa: 0.4,
  Suscripciones: 0.2,
  Compras: 0.55,
  Otros: 0.25,
}

export const CATEGORIA_BUCKET: Record<(typeof CATEGORIAS_DEFAULT)[number], Bucket503020> = {
  Comida: 'necesidades',
  Transporte: 'necesidades',
  Casa: 'necesidades',
  Suscripciones: 'caprichos',
  Compras: 'caprichos',
  Otros: 'caprichos',
}
