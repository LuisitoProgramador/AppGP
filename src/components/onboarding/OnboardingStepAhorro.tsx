import { PORCENTAJE_AHORRO_MAX, PORCENTAJE_AHORRO_MIN, PORCENTAJE_AHORRO_STEP } from '../../constants/porcentajeAhorro'
import { CATEGORIAS_DEFAULT } from '../../types/gasto'
import { formatCurrency } from '../../utils/format/formatCurrency'
import {
  buttonGhostSmFlexClassName,
  buttonPrimaryFlexClassName,
  cardClassName,
} from '../ui/formStyles'
import type { OnboardingFlowState } from './useOnboardingFlow'

type OnboardingStepAhorroProps = Pick<
  OnboardingFlowState,
  | 'porcentajeAhorro'
  | 'setPorcentajeAhorro'
  | 'ahorroPreview'
  | 'limitePreview'
  | 'sueldoNum'
  | 'regla503020Preview'
  | 'guardando'
  | 'goToStep'
  | 'handleFinish'
>

export default function OnboardingStepAhorro({
  porcentajeAhorro,
  setPorcentajeAhorro,
  ahorroPreview,
  limitePreview,
  sueldoNum,
  regla503020Preview,
  guardando,
  goToStep,
  handleFinish,
}: OnboardingStepAhorroProps) {
  return (
    <div className={cardClassName}>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-white">Tu ahorro semanal</h2>
        <p className="text-sm text-slate-400">
          Ajusta cuánto quieres ahorrar cada semana. El resto se reparte en necesidades (50%) y
          caprichos (30%) de lo disponible para gastar.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-3xl font-bold text-pulso-accent-muted">{porcentajeAhorro}%</span>
          {ahorroPreview != null && ahorroPreview > 0 && (
            <span className="text-sm text-slate-400">
              ≈ {formatCurrency(ahorroPreview)}/semana
            </span>
          )}
        </div>

        <input
          type="range"
          min={PORCENTAJE_AHORRO_MIN}
          max={PORCENTAJE_AHORRO_MAX}
          step={PORCENTAJE_AHORRO_STEP}
          value={porcentajeAhorro}
          onChange={(e) => setPorcentajeAhorro(Number(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-pulso-accent"
          aria-label="Porcentaje de ahorro semanal"
        />

        <div className="flex justify-between text-xs text-slate-500">
          <span>{PORCENTAJE_AHORRO_MIN}%</span>
          <span>{PORCENTAJE_AHORRO_MAX}%</span>
        </div>
      </div>

      {limitePreview != null && sueldoNum > 0 && (
        <div className="space-y-3 rounded-xl border border-pulso-accent/30 bg-pulso-accent/10 px-4 py-3 text-sm text-pulso-accent-muted">
          <p>
            Con {porcentajeAhorro}% de ahorro, tu presupuesto mensual para gastar será de{' '}
            <strong className="text-white">{formatCurrency(limitePreview)}</strong>
          </p>
          {regla503020Preview && (
            <>
              <p className="text-xs text-slate-400">
                Límites por categoría (50/30/20 sobre lo disponible para gastar):
              </p>
              <ul className="space-y-1 text-xs text-slate-300">
                {CATEGORIAS_DEFAULT.map((categoria) => {
                  const limite = regla503020Preview.limites[categoria]
                  if (limite == null) return null
                  return (
                    <li key={categoria} className="flex justify-between gap-2">
                      <span>{categoria}</span>
                      <span>{formatCurrency(limite)}</span>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => goToStep(3)}
          className={buttonGhostSmFlexClassName}
        >
          Atrás
        </button>
        <button
          type="button"
          onClick={handleFinish}
          disabled={guardando}
          className={buttonPrimaryFlexClassName}
        >
          {guardando ? 'Configurando...' : 'Finalizar'}
        </button>
      </div>
    </div>
  )
}
