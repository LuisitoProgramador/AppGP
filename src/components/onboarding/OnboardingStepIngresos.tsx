import { DIAS_PAGO_SELECT_OPTIONS } from '../../constants/formOptions'
import { formatCurrency } from '../../utils/format/formatCurrency'
import {
  buttonPrimaryClassName,
  cardClassName,
} from '../ui/formStyles'
import Select from '../ui/Select'
import MontoInput from '../ui/MontoInput'
import type { OnboardingFlowState } from './useOnboardingFlow'

type OnboardingStepIngresosProps = Pick<
  OnboardingFlowState,
  | 'sueldoMensual'
  | 'setSueldoMensual'
  | 'diaPago'
  | 'setDiaPago'
  | 'sueldoNum'
  | 'regla503020Preview'
  | 'handleStep1Next'
>

export default function OnboardingStepIngresos({
  sueldoMensual,
  setSueldoMensual,
  diaPago,
  setDiaPago,
  sueldoNum,
  regla503020Preview,
  handleStep1Next,
}: OnboardingStepIngresosProps) {
  return (
    <div className={cardClassName}>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-white">¿Cuánto ganas al mes?</h2>
        <p className="text-sm text-slate-400">
          Ingresa tu sueldo mensual. Pulso reparte tus ingresos con la regla 50/30/20
        </p>
      </div>

      <p className="rounded-xl border border-slate-700/60 bg-slate-900/40 px-4 py-3 text-xs leading-relaxed text-slate-400">
        <span className="font-medium text-slate-300">50% necesidades</span> (Comida,
        Transporte, Casa) ·{' '}
        <span className="font-medium text-slate-300">30% caprichos</span> (Suscripciones,
        Compras, Otros) ·{' '}
        <span className="font-medium text-slate-300">20% ahorro</span> para el futuro
      </p>

      <div className="space-y-2">
        <label htmlFor="onb-sueldo" className="block text-sm font-medium text-slate-300">
          Sueldo mensual
        </label>
        <MontoInput
          id="onb-sueldo"
          value={sueldoMensual}
          onChange={setSueldoMensual}
          placeholder="0"
        />
      </div>

      {regla503020Preview && (
        <div className="space-y-2 rounded-xl border border-pulso-accent/30 bg-pulso-accent/10 px-4 py-3">
          <p className="text-sm text-pulso-accent-muted">
            Ingreso base:{' '}
            <strong className="text-white">{formatCurrency(sueldoNum)}</strong>
          </p>
          <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
            <div>
              <p className="text-slate-400">Necesidades</p>
              <p className="font-semibold text-white">
                {formatCurrency(regla503020Preview.necesidades)}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Caprichos</p>
              <p className="font-semibold text-white">
                {formatCurrency(regla503020Preview.caprichos)}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Ahorro</p>
              <p className="font-semibold text-white">
                {formatCurrency(regla503020Preview.ahorro)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="onb-dia-pago" className="block text-sm font-medium text-slate-300">
          Día de pago
        </label>
        <Select
          id="onb-dia-pago"
          value={String(diaPago)}
          onChange={(value) => setDiaPago(Number(value))}
          aria-label="Día de pago"
          options={DIAS_PAGO_SELECT_OPTIONS}
        />
        <p className="text-xs text-slate-500">
          El día de la semana en que recibes tu sueldo semanal
        </p>
      </div>

      <button type="button" onClick={handleStep1Next} className={buttonPrimaryClassName}>
        Continuar
      </button>
    </div>
  )
}
