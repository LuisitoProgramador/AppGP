import { memo } from 'react'
import { formatCurrency } from '../../../utils/format/formatCurrency'
import { accentWarningPanelClassName, buttonPrimaryCompactClassName, buttonGhostClassName } from '../../ui/formStyles'

interface WelcomeBackBannerProps {
  diasAusente: number
  disponible: number | null
  onRegistrar: () => void
  onDismiss: () => void
}

export default memo(function WelcomeBackBanner({
  diasAusente,
  disponible,
  onRegistrar,
  onDismiss,
}: WelcomeBackBannerProps) {
  return (
    <div className={`${accentWarningPanelClassName} space-y-3 p-4`}>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-pulso-warning">Bienvenido de vuelta</p>
        <p className="text-sm text-slate-300">
          Llevas {diasAusente} días sin abrir Pulso.
          {disponible != null && (
            <> Tu disponible hoy es {formatCurrency(disponible)}.</>
          )}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onRegistrar} className={buttonPrimaryCompactClassName}>
          Registrar un gasto
        </button>
        <button type="button" onClick={onDismiss} className={buttonGhostClassName}>
          Solo ver resumen
        </button>
      </div>
    </div>
  )
})
