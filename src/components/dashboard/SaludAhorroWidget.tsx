import { memo } from 'react'
import type { SaludAhorro, SaludNivel } from '../../utils/saludAhorro'

const SALUD_STYLES: Record<SaludNivel, { border: string; bg: string; text: string }> = {
  excelente: {
    border: 'border-pulso-accent/35',
    bg: 'bg-pulso-accent/12',
    text: 'text-pulso-accent-muted',
  },
  alto: {
    border: 'border-pulso-accent/30',
    bg: 'bg-pulso-accent/10',
    text: 'text-pulso-accent',
  },
  medio: {
    border: 'border-pulso-accent-dim/30',
    bg: 'bg-pulso-accent-dim/10',
    text: 'text-pulso-accent-dim',
  },
  bajo: {
    border: 'border-pulso-warning/30',
    bg: 'bg-pulso-warning/10',
    text: 'text-pulso-warning',
  },
}

interface SaludAhorroWidgetProps {
  saludAhorro: SaludAhorro
}

export default memo(function SaludAhorroWidget({ saludAhorro }: SaludAhorroWidgetProps) {
  const styles = SALUD_STYLES[saludAhorro.nivel]

  return (
    <div className={`rounded-xl border px-4 py-3 ${styles.border} ${styles.bg}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Salud de ahorro
        </p>
        <span className={`text-sm font-bold ${styles.text}`}>{saludAhorro.porcentaje}%</span>
      </div>
      <p className={`mt-1 text-sm ${styles.text}`}>{saludAhorro.mensaje}</p>
    </div>
  )
})
