import { formatCurrency } from '../format/formatCurrency'

export interface ResumenInsightInput {
  gastoTotal: number
  limiteMensual: number | null
  gastosPorCategoria: Record<string, number>
  gastosMesAnterior?: Record<string, number>
  disponible: number | null
}

export interface ResumenInsight {
  linea: string
  recomendacion: string
}

export function buildResumenInsights(input: ResumenInsightInput): ResumenInsight {
  const { gastoTotal, limiteMensual, gastosPorCategoria, gastosMesAnterior, disponible } = input

  const categorias = Object.entries(gastosPorCategoria).sort((a, b) => b[1] - a[1])
  const top = categorias[0]

  let linea = top
    ? `Tu mayor gasto este mes es ${top[0]} (${formatCurrency(top[1])}).`
    : `Aún no hay gastos registrados este mes.`

  if (limiteMensual != null && limiteMensual > 0) {
    const pct = Math.round((gastoTotal / limiteMensual) * 100)
    linea += ` Llevas ${formatCurrency(gastoTotal)} de ${formatCurrency(limiteMensual)} (${pct}%).`
  }

  if (top && gastosMesAnterior) {
    const prev = gastosMesAnterior[top[0]] ?? 0
    if (prev > 0) {
      const diff = top[1] - prev
      const pctDiff = Math.round((diff / prev) * 100)
      if (Math.abs(pctDiff) >= 10) {
        linea +=
          diff > 0
            ? ` ${top[0]} subió ${pctDiff}% vs el mes pasado.`
            : ` ${top[0]} bajó ${Math.abs(pctDiff)}% vs el mes pasado.`
      }
    }
  }

  let recomendacion = 'Registra tus gastos al momento para no perder el hilo.'
  if (disponible != null && limiteMensual != null && disponible < limiteMensual * 0.2) {
    recomendacion = 'Queda poco margen este mes: prioriza lo esencial hasta tu próximo ingreso.'
  } else if (top && top[0] === 'Comida') {
    recomendacion = 'Si quieres ajustar, revisa comidas fuera de casa esta semana.'
  } else if (top) {
    recomendacion = `Revisa si los gastos en ${top[0]} siguen alineados con tu plan.`
  }

  return { linea, recomendacion }
}
