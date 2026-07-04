import { memo, type FormEvent } from 'react'
import { formatCurrency } from '../../utils/formatCurrency'
import {
  formWithKeyboardClassName,
  inputClassName,
  buttonSecondaryClassName,
} from '../formStyles'

interface PresupuestoWidgetProps {
  disponible: number
  presupuestoDiario: number
  limiteMensual: number
  diasRestantesEfectivos: number
  recibosEfectivos: number
  msiPendientes: number
  quincenaPeriodo: string | null
  vistaQuincenal: boolean
  modoTranquilo: boolean
  diaAgotamiento: number | null
  limiteInput: string
  guardandoLimite: boolean
  onLimiteInputChange: (value: string) => void
  onGuardarLimite: (event: FormEvent<HTMLFormElement>) => void
  onToggleVistaQuincenal: () => void
  mode?: 'summary' | 'settings'
}

function PresupuestoSummary({
  disponible,
  presupuestoDiario,
  limiteMensual,
  diasRestantesEfectivos,
  recibosEfectivos,
  msiPendientes,
  quincenaPeriodo,
  vistaQuincenal,
  modoTranquilo,
  diaAgotamiento,
}: Pick<
  PresupuestoWidgetProps,
  | 'disponible'
  | 'presupuestoDiario'
  | 'limiteMensual'
  | 'diasRestantesEfectivos'
  | 'recibosEfectivos'
  | 'msiPendientes'
  | 'quincenaPeriodo'
  | 'vistaQuincenal'
  | 'modoTranquilo'
  | 'diaAgotamiento'
>) {
  const dentroDeLimite = disponible >= 0 || modoTranquilo

  return (
    <div
      className={`rounded-2xl border px-5 py-6 text-center ${
        dentroDeLimite
          ? 'border-emerald-500/30 bg-emerald-500/10'
          : 'border-amber-500/30 bg-amber-500/10'
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        Disponible este mes
      </p>
      <p
        className={`mt-2 text-4xl font-bold sm:text-5xl ${
          dentroDeLimite ? 'text-white' : 'text-amber-300'
        }`}
      >
        {formatCurrency(disponible)}
      </p>
      <p
        className={`mt-3 text-lg font-semibold ${
          dentroDeLimite ? 'text-emerald-400' : 'text-amber-400'
        }`}
      >
        {dentroDeLimite
          ? `${formatCurrency(presupuestoDiario)} por día`
          : `Excedido en ${formatCurrency(Math.abs(disponible))}`}
      </p>
      <p className="mt-2 text-xs text-slate-500">
        {vistaQuincenal ? (
          <>
            Quincena {quincenaPeriodo} · Límite {formatCurrency(limiteMensual / 2)} ·{' '}
            {diasRestantesEfectivos} días restantes
          </>
        ) : (
          <>
            Límite mensual {formatCurrency(limiteMensual)} · {diasRestantesEfectivos} días
            restantes
          </>
        )}
      </p>
      {(recibosEfectivos > 0 || msiPendientes > 0) && (
        <p className="mt-2 text-xs text-slate-400">
          Sin contar
          {recibosEfectivos > 0 && ` ${formatCurrency(recibosEfectivos)} en pagos próximos`}
          {recibosEfectivos > 0 && msiPendientes > 0 && ' ni'}
          {msiPendientes > 0 && ` ${formatCurrency(msiPendientes)} en MSI pendientes`}
        </p>
      )}
      {diaAgotamiento != null && !vistaQuincenal && (
        <p className="mt-1 text-xs text-slate-400">
          Al ritmo actual, el presupuesto se agotaría alrededor del día {diaAgotamiento}
        </p>
      )}
    </div>
  )
}

export default memo(function PresupuestoWidget(props: PresupuestoWidgetProps) {
  const {
    vistaQuincenal,
    limiteInput,
    guardandoLimite,
    onLimiteInputChange,
    onGuardarLimite,
    onToggleVistaQuincenal,
    mode = 'summary',
  } = props

  if (mode === 'settings') {
    return (
      <div className="space-y-4">
        <p className="text-sm font-medium text-slate-300">Ajustes de presupuesto</p>
        <div className="flex items-center justify-center">
          <div className="inline-flex rounded-full border border-slate-600/80 bg-slate-900/60 p-0.5 text-[10px]">
            <button
              type="button"
              onClick={() => vistaQuincenal && onToggleVistaQuincenal()}
              className={`rounded-full px-3 py-1.5 font-medium min-h-9 touch-manipulation transition active:scale-[0.98] ${
                !vistaQuincenal
                  ? 'bg-blue-500/20 text-blue-300 active:bg-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 active:bg-slate-700'
              }`}
            >
              Vista mensual
            </button>
            <button
              type="button"
              onClick={() => !vistaQuincenal && onToggleVistaQuincenal()}
              className={`rounded-full px-3 py-1.5 font-medium min-h-9 touch-manipulation transition active:scale-[0.98] ${
                vistaQuincenal
                  ? 'bg-blue-500/20 text-blue-300 active:bg-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 active:bg-slate-700'
              }`}
            >
              Vista quincenal
            </button>
          </div>
        </div>

        <form onSubmit={onGuardarLimite} className={`flex gap-2 ${formWithKeyboardClassName}`}>
          <div className="min-w-0 flex-1">
            <label htmlFor="limite" className="sr-only">
              Límite mensual
            </label>
            <input
              id="limite"
              type="number"
              inputMode="decimal"
              min="1"
              step="100"
              value={limiteInput}
              onChange={(e) => onLimiteInputChange(e.target.value)}
              className={inputClassName}
              placeholder="Límite mensual"
            />
          </div>
          <button
            type="submit"
            disabled={guardandoLimite}
            className={`shrink-0 ${buttonSecondaryClassName}`}
          >
            {guardandoLimite ? 'Guardando...' : 'Guardar'}
          </button>
        </form>
      </div>
    )
  }

  return <PresupuestoSummary {...props} />
})
