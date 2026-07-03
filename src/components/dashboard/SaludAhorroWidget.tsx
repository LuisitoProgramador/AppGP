import { memo } from 'react'
import type { SaludAhorro, SaludNivel } from '../../utils/saludAhorro'

const SALUD_STYLES: Record<SaludNivel, { border: string; bg: string; text: string }> = {
  excelente: {
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
  },
  alto: {
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
  },
  medio: {
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
  },
  bajo: {
    border: 'border-red-500/30',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
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
