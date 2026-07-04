import { memo } from 'react'
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  BAR_CHART_MARGIN,
  BAR_RADIUS,
  BAR_X_TICK,
  BAR_Y_TICK,
  CHART_TOOLTIP_STYLE,
  formatBarYAxisTick,
  formatChartCurrency,
} from '../constants/formOptions'

export interface MesTotal {
  label: string
  total: number
}

interface GastoBarChartProps {
  data: MesTotal[]
}

function GastoBarChart({ data }: GastoBarChartProps) {
  if (data.length === 0) return null

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={BAR_CHART_MARGIN}>
          <XAxis
            dataKey="label"
            tick={BAR_X_TICK}
            axisLine={{ stroke: '#2a3548' }}
            tickLine={false}
          />
          <YAxis
            tick={BAR_Y_TICK}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatBarYAxisTick}
            width={48}
          />
          <Tooltip formatter={formatChartCurrency} contentStyle={CHART_TOOLTIP_STYLE} />
          <Bar dataKey="total" fill="#4f8cff" radius={BAR_RADIUS} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default memo(GastoBarChart)
