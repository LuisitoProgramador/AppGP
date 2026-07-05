import { memo, useMemo } from 'react'
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { useChartAnimation, CHART_ANIMATION_MS } from '../../hooks/useChartAnimation'
import type { CategoriaResumen } from '../../types/gasto'
import { colorCategoriaHex } from '../../types/gasto'
import { CHART_HEIGHT_PX, CHART_TOOLTIP_STYLE, formatChartCurrency } from '../../constants/formOptions'

interface GastoChartProps {
  data: CategoriaResumen[]
}

function GastoChart({ data }: GastoChartProps) {
  const animate = useChartAnimation()
  const chartData = useMemo(
    () => data.map((item) => ({ name: item.categoria, value: item.total })),
    [data],
  )

  if (chartData.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="w-full" style={{ height: CHART_HEIGHT_PX }} aria-hidden="true">
        <ResponsiveContainer width="100%" height={CHART_HEIGHT_PX}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              isAnimationActive={animate}
              animationDuration={CHART_ANIMATION_MS}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={colorCategoriaHex(entry.name, index)}
                />
              ))}
            </Pie>
            <Tooltip formatter={formatChartCurrency} contentStyle={CHART_TOOLTIP_STYLE} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="grid grid-cols-2 gap-2 text-xs sm:hidden" aria-label="Leyenda por categoría">
        {chartData.map((entry, index) => (
          <li key={entry.name} className="flex items-center gap-2 text-slate-300">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: colorCategoriaHex(entry.name, index) }}
            />
            <span className="truncate">{entry.name}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default memo(GastoChart)
