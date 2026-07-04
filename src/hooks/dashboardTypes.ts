import type { GastoRecurrente } from '../types/gasto'
import type { RecurrenteSugerido } from '../utils/detectarRecurrentes'

export interface ResumenMensual {
  categoria: string
  total: number
  cantidad: number
}

export interface GastoMsiRow {
  monto: number
  fecha: string
}

export interface EvolucionRow {
  mes: string
  total: number
}

export interface DashboardQueryState {
  cargando: boolean
  error: string | null
  resumenMensual: ResumenMensual[]
  limiteMensual: number
  ingresoMensualTotal: number | null
  patrimonioLiquido: number | null
  recurrentes: GastoRecurrente[]
  gastosMsi: GastoMsiRow[]
  evolucionRows: EvolucionRow[]
  gastoQuincenaBase: number
  gastoTotalResumen: number | null
  gastoTotalAntesResumen: number | null
  recurrenteSugerido: RecurrenteSugerido | null
}

export interface DashboardQueryActions {
  setLimiteMensual: (limite: number) => void
  setRecurrenteSugerido: (value: RecurrenteSugerido | null) => void
}

export interface UseDashboardDataOptions {
  lite?: boolean
}
