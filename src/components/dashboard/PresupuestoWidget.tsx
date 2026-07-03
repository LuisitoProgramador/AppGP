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
}

export default memo(function PresupuestoWidget({
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
  limiteInput,
  guardandoLimite,
  onLimiteInputChange,
  onGuardarLimite,
  onToggleVistaQuincenal,
}: PresupuestoWidgetProps) {
  return (
    <>
      <div
        className={`rounded-xl border px-4 py-3 text-center ${
          disponible >= 0
            ? 'border-emerald-500/30 bg-emerald-500/10'
            : 'border-amber-500/30 bg-amber-500/10'
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Presupuesto diario
          </p>
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
              Mensual
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
              Quincenal
            </button>
          </div>
        </div>
        <p
          className={`mt-1 text-2xl font-bold ${
            disponible >= 0 || modoTranquilo ? 'text-emerald-400' : 'text-amber-400'
          }`}
        >
          {disponible >= 0 || modoTranquilo
            ? `Puedes gastar ${formatCurrency(presupuestoDiario)} hoy`
            : `Apretado: ${formatCurrency(Math.abs(disponible))} sobre tu límite`}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {vistaQuincenal ? (
            <>
              Quincena {quincenaPeriodo} · Límite {formatCurrency(limiteMensual / 2)} ·{' '}
              {diasRestantesEfectivos} días restantes
            </>
          ) : (
            <>
              Límite {formatCurrency(limiteMensual)} · {diasRestantesEfectivos} días restantes
            </>
          )}
        </p>
        {(recibosEfectivos > 0 || msiPendientes > 0) && (
          <p className="mt-1 text-xs text-slate-400">
            Excluyendo
            {recibosEfectivos > 0 && ` ${formatCurrency(recibosEfectivos)} en recibos próximos`}
            {recibosEfectivos > 0 && msiPendientes > 0 && ' y'}
            {msiPendientes > 0 && ` ${formatCurrency(msiPendientes)} en MSI pendientes`}
          </p>
        )}
        {diaAgotamiento != null && !vistaQuincenal && (
          <p className="mt-1 text-xs text-slate-400">
            Al ritmo actual, tu límite se acaba ~el día {diaAgotamiento}
          </p>
        )}
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
          {guardandoLimite ? '...' : 'Guardar'}
        </button>
      </form>
    </>
  )
})
