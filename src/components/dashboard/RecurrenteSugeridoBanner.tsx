import { memo } from 'react'
import type { RecurrenteSugerido } from '../../utils/detectarRecurrentes'
import { formatCurrency } from '../../utils/formatCurrency'
import { buttonGhostClassName, buttonSkyClassName } from '../formStyles'

interface RecurrenteSugeridoBannerProps {
  sugerido: RecurrenteSugerido
  marcando: boolean
  onMarcar: () => void
  onDescartar: () => void
}

export default memo(function RecurrenteSugeridoBanner({
  sugerido,
  marcando,
  onMarcar,
  onDescartar,
}: RecurrenteSugeridoBannerProps) {
  return (
    <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-3">
      <p className="text-sm text-sky-100">
        Llevas 3 meses pagando {sugerido.descripcion} ~ {formatCurrency(sugerido.monto)}. ¿Lo
        marco como recurrente?
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={onMarcar} disabled={marcando} className={buttonSkyClassName}>
          {marcando ? 'Guardando...' : 'Sí, marcar'}
        </button>
        <button type="button" onClick={onDescartar} className={buttonGhostClassName}>
          Ahora no
        </button>
      </div>
    </div>
  )
})
