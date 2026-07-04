import { calcEstrategiaFinanciera } from './index'

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

/** Al guardar estrategia, respeta un límite manual activo. */
export function limiteTrasActualizarEstrategia(
  existing: Pick<PresupuestoLimiteInput, 'limite_mensual' | 'limite_es_manual'>,
  limiteCalculado: number,
): { limite_mensual: number; limite_es_manual: boolean } {
  if (existing.limite_es_manual) {
    return { limite_mensual: existing.limite_mensual, limite_es_manual: true }
  }
  return { limite_mensual: limiteCalculado, limite_es_manual: false }
}
