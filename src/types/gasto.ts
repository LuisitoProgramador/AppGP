export interface Gasto {
  id: number
  monto: number
  categoria: string
  descripcion: string | null
  fecha: string
}

export interface OptimisticGasto {
  tempId: string
  monto: number
  categoria: string
  descripcion: string
  fecha: string
}

export interface PendingGasto {
  id: string
  monto: number
  categoria: string
  descripcion: string
  fecha: string
  createdAt: number
  retryCount: number
}

export interface CategoriaResumen {
  categoria: string
  total: number
  porcentaje: number
  cantidad?: number
}

export const CATEGORIAS = [
  'Comida',
  'Transporte',
  'Casa',
  'Suscripciones',
  'Otros',
] as const

export const COLORES_CATEGORIA: Record<string, string> = {
  Comida: 'bg-amber-500',
  Transporte: 'bg-blue-500',
  Casa: 'bg-emerald-500',
  Suscripciones: 'bg-violet-500',
  Otros: 'bg-slate-400',
}

export const LIMITE_MENSUAL_DEFAULT = 10000
export const MAX_MONTO = 1_000_000
export const MAX_DESCRIPCION_LENGTH = 200
export const HISTORIAL_PAGE_SIZE = 20

export interface GastoRecurrente {
  id: number
  descripcion: string
  monto: number
  categoria: string
  dia_mes: number
  ultimo_registro: string | null
}

export interface GastoRecurrenteInput {
  descripcion: string
  monto: number
  categoria: string
  dia_mes: number
}

export const CHART_COLORS_HEX: Record<string, string> = {
  Comida: '#f59e0b',
  Transporte: '#3b82f6',
  Casa: '#10b981',
  Suscripciones: '#8b5cf6',
  Otros: '#94a3b8',
}
