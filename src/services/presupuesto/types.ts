export interface Presupuesto {
  limite_mensual: number
  limite_es_manual: boolean
  sueldo_mensual: number | null
  ingresos_extras: number | null
  sueldo_semanal: number | null
  dia_pago: number | null
  porcentaje_ahorro: number | null
}

export interface PresupuestoFinancieroInput {
  sueldo_mensual: number
  ingresos_extras: number
  porcentaje_ahorro: number
  dia_pago: number
}
