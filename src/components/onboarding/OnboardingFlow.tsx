import { TOTAL_STEPS, STEP_TITLES } from './constants'
import OnboardingStepAhorro from './OnboardingStepAhorro'
import OnboardingStepCuentas from './OnboardingStepCuentas'
import OnboardingStepGastosFijos from './OnboardingStepGastosFijos'
import OnboardingStepIngresos from './OnboardingStepIngresos'
import StepIndicator from './StepIndicator'
import type { OnboardingFlowProps } from './types'
import { useOnboardingFlow } from './useOnboardingFlow'

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const flow = useOnboardingFlow(onComplete)

  return (
    <section className="space-y-6">
      <div className="space-y-3 text-center">
        <p className="text-sm font-medium text-pulso-accent-muted">
          Paso {flow.step} de {TOTAL_STEPS}
        </p>
        <h1 className="text-2xl font-bold">Configura tu presupuesto</h1>
        <p className="text-sm text-slate-400">{STEP_TITLES[flow.step - 1]}</p>
        <StepIndicator step={flow.step} />
      </div>

      <div
        className={`transition-all duration-300 ease-out ${
          flow.animating ? 'translate-x-2 opacity-0' : 'translate-x-0 opacity-100'
        }`}
      >
        {flow.step === 1 && <OnboardingStepIngresos {...flow} />}
        {flow.step === 2 && <OnboardingStepCuentas {...flow} />}
        {flow.step === 3 && <OnboardingStepGastosFijos {...flow} />}
        {flow.step === 4 && <OnboardingStepAhorro {...flow} />}
      </div>
    </section>
  )
}
