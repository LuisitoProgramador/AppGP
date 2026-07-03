import { formatCurrency } from './formatCurrency'

export type MeAlcanzaTono = 'bien' | 'apretado' | 'excedido'

export interface MeAlcanzaResult {
  disponibleDespues: number
  nuevoPresupuestoDiario: number
  tono: MeAlcanzaTono
  mensaje: string
}

export function calcMeAlcanza(params: {
  disponible: number
  diasRestantes: number
  montoEstimado: number
  presupuestoDiarioActual: number
}): MeAlcanzaResult | null {
  const { disponible, diasRestantes, montoEstimado, presupuestoDiarioActual } = params

  if (!Number.isFinite(montoEstimado) || montoEstimado <= 0) return null

  const disponibleDespues = disponible - montoEstimado
  const nuevoPresupuestoDiario =
    diasRestantes > 0 ? disponibleDespues / diasRestantes : disponibleDespues

  if (disponibleDespues < 0) {
    return {
      disponibleDespues,
      nuevoPresupuestoDiario,
      tono: 'excedido',
      mensaje: `Estarías apretado, excederías tu límite por ${formatCurrency(Math.abs(disponibleDespues))}`,
    }
  }

  const quedaApretado =
    presupuestoDiarioActual > 0 && nuevoPresupuestoDiario < presupuestoDiarioActual * 0.5

  if (quedaApretado) {
    return {
      disponibleDespues,
      nuevoPresupuestoDiario,
      tono: 'apretado',
      mensaje: `Si lo compras, te quedarían ${formatCurrency(nuevoPresupuestoDiario)} al día — un poco justo`,
    }
  }

  return {
    disponibleDespues,
    nuevoPresupuestoDiario,
    tono: 'bien',
    mensaje: `Si lo compras, te quedarían ${formatCurrency(nuevoPresupuestoDiario)} al día`,
  }
}
