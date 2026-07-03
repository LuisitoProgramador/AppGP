import { memo } from 'react'

export default memo(function BurnRateAlert() {
  return (
    <div className="rounded-xl border border-orange-500/25 bg-orange-500/10 px-4 py-3">
      <p className="text-sm text-orange-200">
        Estás gastando rápido este mes. ¡Intenta pisar el freno!
      </p>
    </div>
  )
})
