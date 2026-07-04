import { DIAS_PAGO } from './diasPago'
import { CATEGORIAS } from '../types/gasto'
import { formatCurrency } from '../utils/formatCurrency'

export const CATEGORIA_SELECT_OPTIONS = CATEGORIAS.map((categoria) => ({
  value: categoria,
  label: categoria,
}))

export const CATEGORIA_FILTER_OPTIONS = [
  { value: 'Todas', label: 'Todas las categorías' },
  ...CATEGORIA_SELECT_OPTIONS,
]

export const DIAS_PAGO_SELECT_OPTIONS = DIAS_PAGO.map(({ value, label }) => ({
  value: String(value),
  label,
}))

export const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#181818',
  border: '1px solid #3a3a3a',
  borderRadius: '0.75rem',
  color: '#f5f5f5',
} as const

export const BAR_CHART_MARGIN = { top: 8, right: 8, left: 0, bottom: 0 } as const
export const BAR_X_TICK = { fill: '#94a3b8', fontSize: 12 } as const
export const BAR_Y_TICK = { fill: '#94a3b8', fontSize: 11 } as const
export const BAR_RADIUS: [number, number, number, number] = [6, 6, 0, 0]

export function formatChartCurrency(value: unknown) {
  return formatCurrency(Number(value))
}

export function formatBarYAxisTick(value: number) {
  return value >= 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${value}`
}
