import { memo } from 'react'
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useChartAnimation, CHART_ANIMATION_MS } from '../../hooks/useChartAnimation'
import {
  BAR_CHART_MARGIN,
  BAR_RADIUS,
  BAR_X_TICK,
  BAR_Y_TICK,
  CHART_HEIGHT_PX,
  CHART_TOOLTIP_STYLE,
  formatBarYAxisTick,
  formatChartCurrency,
} from '../../constants/formOptions'

export interface MesTotal {
  label: string
  total: number
}

interface GastoBarChartProps {
  data: MesTotal[]
}

function GastoBarChart({ data }: GastoBarChartProps) {
  const animate = useChartAnimation()

  if (data.length === 0) return null

  return (
    <div className="w-full" style={{ height: CHART_HEIGHT_PX }}>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT_PX}>
        <BarChart data={data} margin={BAR_CHART_MARGIN}>
          <XAxis
            dataKey="label"
            tick={BAR_X_TICK}
            axisLine={{ stroke: '#3a3a3a' }}
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
          <Bar
            dataKey="total"
            fill="#e5e5e5"
            radius={BAR_RADIUS}
            isAnimationActive={animate}
            animationDuration={CHART_ANIMATION_MS}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default memo(GastoBarChart)
