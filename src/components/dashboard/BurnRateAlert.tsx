import { memo } from 'react'
import { dashboardCardClassName } from '../formStyles'

export default memo(function BurnRateAlert() {
  return (
    <div className={`${dashboardCardClassName} border-orange-500/25 bg-orange-500/10`}>
      <p className="text-sm text-orange-200">
        Estás gastando rápido este mes. ¡Intenta pisar el freno!
      </p>
    </div>
  )
})
