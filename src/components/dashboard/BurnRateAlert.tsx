import { memo } from 'react'
import { dashboardCardClassName } from '../formStyles'

export default memo(function BurnRateAlert() {
  return (
    <div className={`${dashboardCardClassName} border-pulso-warning/25 bg-pulso-warning/10 py-3`}>
      <p className="text-sm text-pulso-warning">
        Estás gastando rápido este mes. ¡Intenta pisar el freno!
      </p>
    </div>
  )
})
