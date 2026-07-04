export const CATEGORIAS_DEFAULT = [
  'Comida',
  'Transporte',
  'Casa',
  'Suscripciones',
  'Compras',
  'Otros',
] as const

/** @deprecated Usar CATEGORIAS_DEFAULT o getCategoriasUsuario */
export const CATEGORIAS = CATEGORIAS_DEFAULT

export type CategoriaDefault = (typeof CATEGORIAS_DEFAULT)[number]
export type Categoria = string

export interface Gasto {
  id: number
  monto: number
  categoria: string
  descripcion: string | null
  fecha: string
  cuenta_id?: string | null
  es_msi?: boolean
  grupo_msi_id?: string | null
}

export interface OptimisticGasto {
  tempId: string
  monto: number
  categoria: string
  descripcion: string
  fecha: string
  cuenta_id?: string | null
  es_msi?: boolean
  grupo_msi_id?: string | null
}

export interface PendingGasto {
  id: string
  userId: string
  monto: number
  categoria: string
  descripcion: string
  fecha: string
  cuenta_id?: string | null
  es_msi?: boolean
  grupo_msi_id?: string | null
  msiInstallments?: GastoInsertFields[]
  optimisticTempIds?: string[]
  createdAt: number
  retryCount: number
}

export type GastoInsertFields = Omit<Gasto, 'id' | 'descripcion' | 'cuenta_id' | 'es_msi' | 'grupo_msi_id'> & {
  descripcion: string
  cuenta_id: string | null
  es_msi: boolean
  grupo_msi_id: string | null
  offline_id?: string | null
}

export interface MsiInstallmentUpdate {
  monto: number
  descripcion: string
  fecha: string
}

export interface CategoriaResumen {
  categoria: string
  total: number
  porcentaje: number
  cantidad?: number
}

export const COLORES_CATEGORIA: Record<string, string> = {
  Comida: 'bg-neutral-400',
  Transporte: 'bg-pulso-accent',
  Casa: 'bg-pulso-accent-dim',
  Suscripciones: 'bg-pulso-accent-muted',
  Otros: 'bg-neutral-600',
}

export const LIMITE_MENSUAL_DEFAULT = 10000
export const MAX_MONTO = 1_000_000
export const MAX_DESCRIPCION_LENGTH = 200
export const MIN_MSI_MESES = 2
export const MAX_MSI_MESES = 48
export const HISTORIAL_PAGE_SIZE = 20

export interface GastoRecurrente {
  id: number
  descripcion: string
  monto: number
  categoria: string
  dia_mes: number
  ultimo_registro: string | null
  cuenta_id: string | null
}

export type GastoRecurrenteInput = Pick<
  GastoRecurrente,
  'descripcion' | 'monto' | 'categoria' | 'dia_mes' | 'cuenta_id'
>

export const CHART_COLORS_HEX: Record<string, string> = {
  Comida: '#d4d4d4',
  Transporte: '#e5e5e5',
  Casa: '#a3a3a3',
  Suscripciones: '#f5f5f5',
  Otros: '#737373',
}
