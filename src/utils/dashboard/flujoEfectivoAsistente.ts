import { roundMoney } from '../core/centavos'
import { formatCurrency } from '../format/formatCurrency'
import type { SalidaTimelineItem } from './salidasTimeline'

export interface FlujoEfectivoAlerta {
  dia: number
  monto: number
  etiqueta: string
  reservaRecomendada: number
  mensaje: string
  urgente: boolean
}

interface FlujoEfectivoParams {
  salidas: SalidaTimelineItem[]
  diaActual: number
  disponible: number
  /** Umbral mínimo para considerar una salida "fuerte" (pesos). */
  umbralFuerte?: number
}

function esSalidaFuerte(monto: number, disponible: number, umbralFuerte: number): boolean {
  if (monto >= umbralFuerte) return true
  if (disponible <= 0) return monto > 0
  return monto >= disponible * 0.25
}

export function calcFlujoEfectivoAlertas({
  salidas,
  diaActual,
  disponible,
  umbralFuerte = 500,
}: FlujoEfectivoParams): FlujoEfectivoAlerta[] {
  const upcoming = salidas
    .filter((item) => item.dia > diaActual)
    .sort((a, b) => a.dia - b.dia || b.monto - a.monto)

  if (upcoming.length === 0) return []

  const alertas: FlujoEfectivoAlerta[] = []

  for (const salida of upcoming) {
    if (!esSalidaFuerte(salida.monto, disponible, umbralFuerte)) continue

    const diasHasta = salida.dia - diaActual
    const deficit = roundMoney(Math.max(0, salida.monto - disponible))
    const reservaDiaria =
      diasHasta > 0 ? roundMoney(salida.monto / diasHasta) : roundMoney(salida.monto)
    const reservaRecomendada = deficit > 0 ? deficit : reservaDiaria
    const urgente = deficit > 0 || diasHasta <= 3

    const mensaje =
      deficit > 0
        ? `El día ${salida.dia} tendrás una salida de ${formatCurrency(salida.monto)} (${salida.etiqueta}). Te conviene apartar ${formatCurrency(reservaRecomendada)} desde hoy.`
        : `El día ${salida.dia} pagarás ${formatCurrency(salida.monto)} (${salida.etiqueta}). Aparta ~${formatCurrency(reservaDiaria)}/día para llegar tranquilo.`

    alertas.push({
      dia: salida.dia,
      monto: salida.monto,
      etiqueta: salida.etiqueta,
      reservaRecomendada,
      mensaje,
      urgente,
    })
  }

  return alertas.slice(0, 2)
}
