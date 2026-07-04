import { CATEGORIAS_DEFAULT } from '../types/gasto'

/** Porcentajes sobre el ingreso mensual total (sueldo + extras). */
export const REGLA_503020 = {
  necesidades: 0.5,
  caprichos: 0.3,
  ahorro: 0.2,
} as const

export type Bucket503020 = 'necesidades' | 'caprichos'

export const BUCKET_LABELS: Record<Bucket503020, string> = {
  necesidades: 'Necesidades (50%)',
  caprichos: 'Caprichos (30%)',
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
