import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import type { CategoriaResumen } from '../types/gasto'
import { CHART_COLORS_HEX } from '../types/gasto'
import { formatCurrency } from '../utils/formatCurrency'

interface GastoChartProps {
  data: CategoriaResumen[]
}

export default function GastoChart({ data }: GastoChartProps) {
  if (data.length === 0) return null

  const chartData = data.map((item) => ({
    name: item.categoria,
    value: item.total,
  }))

  return (
    <div className="space-y-3">
      <div className="h-56 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
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
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={CHART_COLORS_HEX[entry.name] ?? '#4f8cff'}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatCurrency(Number(value))}
              contentStyle={{
                backgroundColor: '#0a0f1a',
                border: '1px solid #2a3548',
                borderRadius: '0.75rem',
                color: '#f8fafc',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="grid grid-cols-2 gap-2 text-xs sm:hidden" aria-label="Leyenda por categoría">
        {chartData.map((entry) => (
          <li key={entry.name} className="flex items-center gap-2 text-slate-300">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: CHART_COLORS_HEX[entry.name] ?? '#4f8cff' }}
            />
            <span className="truncate">{entry.name}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
