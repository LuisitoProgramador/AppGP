export const CATEGORIAS_DEFAULT = [
  'Comida',
  'Transporte',
  'Casa',
  'Suscripciones',
  'Compras',
  'Otros',
] as const

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
  total_compra_msi?: number | null
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
  total_compra_msi?: number | null
  msiInstallments?: GastoInsertFields[]
  optimisticTempIds?: string[]
  createdAt: number
  retryCount: number
}

export type GastoInsertFields = Omit<Gasto, 'id' | 'descripcion' | 'cuenta_id' | 'es_msi' | 'grupo_msi_id' | 'total_compra_msi'> & {
  descripcion: string
  cuenta_id: string | null
  es_msi: boolean
  grupo_msi_id: string | null
  total_compra_msi?: number | null
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

/** Colores sutiles pero distinguibles en fondo oscuro (#181818 / #242424). */
export const CATEGORIA_COLOR_HEX: Record<string, string> = {
  Comida: '#c9a06c',
  Transporte: '#6a9ec4',
  Casa: '#6da882',
  Suscripciones: '#9582b8',
  Compras: '#c47a7a',
  Otros: '#8a9199',
}

const CATEGORIA_PALETTE = Object.values(CATEGORIA_COLOR_HEX)

export function colorCategoriaHex(categoria: string, index = 0): string {
  return CATEGORIA_COLOR_HEX[categoria] ?? CATEGORIA_PALETTE[index % CATEGORIA_PALETTE.length] ?? '#8a9199'
}

/** @deprecated Usar colorCategoriaHex — mapa directo para compatibilidad con recharts */
export const CHART_COLORS_HEX: Record<string, string> = CATEGORIA_COLOR_HEX

/** @deprecated Usar colorCategoriaHex con style.backgroundColor */
export const COLORES_CATEGORIA: Record<string, string> = {
  Comida: 'bg-[#c9a06c]',
  Transporte: 'bg-[#6a9ec4]',
  Casa: 'bg-[#6da882]',
  Suscripciones: 'bg-[#9582b8]',
  Compras: 'bg-[#c47a7a]',
  Otros: 'bg-[#8a9199]',
}

export const LIMITE_MENSUAL_DEFAULT = 10000
export { MAX_MONTO, MAX_DESCRIPCION_LENGTH, MIN_MSI_MESES, MAX_MSI_MESES } from './limits'

/** Movimientos internos; excluidos del presupuesto y del resumen mensual. */
export const CATEGORIA_TRANSFERENCIA = 'Transferencia'

/** Gastos reales de consumo; excluye transferencias internas entre cuentas. */
export function esGastoPresupuestable(categoria: string): boolean {
  return categoria !== CATEGORIA_TRANSFERENCIA
}

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
