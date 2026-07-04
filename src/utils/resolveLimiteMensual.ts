import { calcEstrategiaFinanciera } from './finanzas'

export interface PresupuestoLimiteInput {
  limite_mensual: number
  limite_es_manual: boolean
  sueldo_mensual: number | null
  ingresos_extras: number | null
  porcentaje_ahorro: number | null
}

export function resolveLimiteMensual(presupuesto: PresupuestoLimiteInput): number {
  if (presupuesto.limite_es_manual) {
    return presupuesto.limite_mensual
  }
  if (presupuesto.sueldo_mensual != null && presupuesto.porcentaje_ahorro != null) {
    return calcEstrategiaFinanciera({
      sueldoMensual: presupuesto.sueldo_mensual,
      ingresosExtras: presupuesto.ingresos_extras ?? 0,
      porcentajeAhorro: presupuesto.porcentaje_ahorro,
    }).disponibleParaGasto
  }
  return presupuesto.limite_mensual
}
