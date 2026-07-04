import { memo } from 'react'
import type { AlertaCategoria } from '../../../services/presupuestoCategorias'
import { formatCurrency } from '../../../utils/format/formatCurrency'
import { accentWarningPanelClassName } from '../../ui/formStyles'

interface CategoryBudgetAlertsProps {
  alertas: AlertaCategoria[]
}

export default memo(function CategoryBudgetAlerts({ alertas }: CategoryBudgetAlertsProps) {
  if (alertas.length === 0) return null

  return (
    <div className="space-y-2">
      {alertas.slice(0, 3).map((alerta) => (
        <div key={alerta.categoria} className={`${accentWarningPanelClassName} px-3 py-2`}>
          <p className="text-sm text-pulso-warning">
            {alerta.categoria}: {formatCurrency(alerta.gastado)} de {formatCurrency(alerta.limite)} (
            {Math.round(alerta.porcentaje * 100)}%)
          </p>
        </div>
      ))}
    </div>
  )
})
