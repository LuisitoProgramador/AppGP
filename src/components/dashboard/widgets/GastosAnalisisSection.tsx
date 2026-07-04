import { lazy, Suspense, memo, useState } from 'react'
import { COLORES_CATEGORIA, type CategoriaResumen } from '../../../types/gasto'
import { formatCurrency } from '../../../utils/format/formatCurrency'
import { chartToggleClassName } from '../../ui/formStyles'
import type { MesTotal } from '../../charts/GastoBarChart'

const GastoChart = lazy(() => import('../../charts/GastoChart'))
const GastoBarChart = lazy(() => import('../../charts/GastoBarChart'))

type ChartView = 'categoria' | 'evolucion'

interface GastosAnalisisSectionProps {
  resumen: CategoriaResumen[]
  evolucionMensual: MesTotal[]
}

export default memo(function GastosAnalisisSection({
  resumen,
  evolucionMensual,
}: GastosAnalisisSectionProps) {
  const [mostrarGraficas, setMostrarGraficas] = useState(false)
  const [chartView, setChartView] = useState<ChartView>('categoria')
  const chartPanelId = 'gastos-analisis-chart-panel'

  return (
    <div className="space-y-3 transition-all duration-300">
      <button
        type="button"
        onClick={() => setMostrarGraficas((v) => !v)}
        className="flex w-full min-h-11 items-center justify-between rounded-xl border border-slate-700/60 bg-slate-900/40 px-4 py-2.5 text-sm font-medium text-slate-300 touch-manipulation transition active:scale-[0.98] active:bg-slate-700/50 hover:border-slate-600 hover:text-white"
      >
        <span>{mostrarGraficas ? 'Ocultar análisis' : 'Ver análisis de gastos'}</span>
        <span className="text-slate-500">{mostrarGraficas ? '▲' : '▼'}</span>
      </button>

      {mostrarGraficas && (
        <div className="space-y-4">
          <div
            className="flex rounded-lg border border-slate-700/60 bg-slate-900/40 p-0.5"
            role="tablist"
            aria-label="Tipo de gráfica"
          >
            <button
              type="button"
              role="tab"
              id="tab-chart-categoria"
              aria-selected={chartView === 'categoria'}
              aria-controls={chartPanelId}
              onClick={() => setChartView('categoria')}
              className={chartToggleClassName(chartView === 'categoria')}
            >
              Por categoría
            </button>
            <button
              type="button"
              role="tab"
              id="tab-chart-evolucion"
              aria-selected={chartView === 'evolucion'}
              aria-controls={chartPanelId}
              onClick={() => setChartView('evolucion')}
              className={chartToggleClassName(chartView === 'evolucion')}
            >
              Evolución mensual
            </button>
          </div>

          <div id={chartPanelId} role="tabpanel" aria-labelledby={`tab-chart-${chartView}`}>
          <Suspense
            fallback={<p className="text-center text-sm text-slate-400">Cargando gráfica...</p>}
          >
            {chartView === 'categoria' ? (
              <GastoChart data={resumen} />
            ) : (
              <GastoBarChart data={evolucionMensual} />
            )}
          </Suspense>
          </div>

          {chartView === 'categoria' && (
            <>
              <h3 className="text-sm font-semibold text-slate-300">Por categoría</h3>
              {resumen.map((item) => (
                <div key={item.categoria} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-slate-200">{item.categoria}</span>
                    <span className="text-slate-400">
                      {formatCurrency(item.total)}{' '}
                      <span className="text-slate-500">({item.porcentaje.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-700/80">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${COLORES_CATEGORIA[item.categoria] ?? 'bg-neutral-500'}`}
                      style={{ width: `${item.porcentaje}%` }}
                    />
                  </div>
                </div>
              ))}
            </>
          )}

          {chartView === 'evolucion' && (
            <p className="text-center text-xs text-slate-500">
              Total gastado en los últimos 4 meses
            </p>
          )}
        </div>
      )}
    </div>
  )
})
