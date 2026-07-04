import { memo } from 'react'
import { accentPositivePanelClassName } from '../formStyles'

interface ResumenInsightsCardProps {
  linea: string
  recomendacion: string
}

export default memo(function ResumenInsightsCard({ linea, recomendacion }: ResumenInsightsCardProps) {
  return (
    <div className={`${accentPositivePanelClassName} space-y-2 p-4`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-pulso-accent-muted">
        Tu mes en 3 líneas
      </p>
      <p className="text-sm text-slate-200">{linea}</p>
      <p className="text-sm text-pulso-accent-muted">{recomendacion}</p>
    </div>
  )
})
