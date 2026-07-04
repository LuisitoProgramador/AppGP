import { formatCurrency } from '../../utils/format/formatCurrency'
import { parseMontoValue } from '../../utils/format/montoInput'
import {
  buttonGhostSmClassName,
  buttonGhostSmFlexClassName,
  buttonPrimaryClassName,
  buttonPrimaryFlexClassName,
  cardClassName,
  formSubmitClassName,
  formWithKeyboardClassName,
  inputClassName,
} from '../ui/formStyles'
import Select from '../ui/Select'
import MontoInput from '../ui/MontoInput'
import { SUGERENCIAS } from './constants'
import type { OnboardingFlowState } from './useOnboardingFlow'

type OnboardingStepGastosFijosProps = Pick<
  OnboardingFlowState,
  | 'totalCuentas'
  | 'gastosFijos'
  | 'gastoForm'
  | 'setGastoForm'
  | 'cuentaOptions'
  | 'cuentaLabelById'
  | 'goToStep'
  | 'handleStep3Next'
  | 'handleAddGasto'
  | 'addSugerencia'
  | 'removeGasto'
>

export default function OnboardingStepGastosFijos({
  totalCuentas,
  gastosFijos,
  gastoForm,
  setGastoForm,
  cuentaOptions,
  cuentaLabelById,
  goToStep,
  handleStep3Next,
  handleAddGasto,
  addSugerencia,
  removeGasto,
}: OnboardingStepGastosFijosProps) {
  return (
    <div className={cardClassName}>
      {totalCuentas === 0 ? (
        <>
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Primero configura tus cuentas</h2>
            <p className="text-sm text-slate-400">
              Los gastos fijos deben vincularse a una cuenta de débito o crédito.
            </p>
            <p className="rounded-xl border border-pulso-warning/30 bg-pulso-warning/10 px-4 py-3 text-sm text-pulso-warning/90">
              No hay cuentas disponibles. Vuelve al paso anterior y crea al menos una.
            </p>
          </div>
          <button
            type="button"
            onClick={() => goToStep(2)}
            className={buttonPrimaryClassName}
          >
            Ir a configurar cuentas
          </button>
        </>
      ) : (
        <>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-white">Gastos fijos del mes</h2>
            <p className="text-sm text-slate-400">
              Renta, suscripciones y pagos que se repiten cada mes
            </p>
          </div>

          {gastosFijos.length > 0 && (
            <div className="divide-y divide-slate-700/80 overflow-hidden rounded-xl border border-slate-700/60">
              {gastosFijos.map((gasto) => (
                <div
                  key={gasto.id}
                  className="flex items-center gap-3 bg-slate-900/40 px-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {gasto.descripcion}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {cuentaLabelById.get(gasto.cuenta_id) ?? 'Cuenta'}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-slate-200">
                    {formatCurrency(parseMontoValue(gasto.monto))}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeGasto(gasto.id)}
                    aria-label={`Eliminar ${gasto.descripcion}`}
                    className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-red-500/10 hover:text-red-400"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {SUGERENCIAS.map((nombre) => (
              <button
                key={nombre}
                type="button"
                onClick={() => addSugerencia(nombre)}
                className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-pulso-accent/50 hover:text-white"
              >
                + {nombre}
              </button>
            ))}
          </div>

          <form
            onSubmit={handleAddGasto}
            className={`space-y-3 border-t border-slate-700/60 pt-4 ${formWithKeyboardClassName}`}
          >
            <div className="space-y-2">
              <label
                htmlFor="onb-gasto-descripcion"
                className="block text-sm font-medium text-slate-300"
              >
                Descripción
              </label>
              <input
                id="onb-gasto-descripcion"
                type="text"
                maxLength={200}
                placeholder="Ej. Renta, Netflix, Internet"
                value={gastoForm.descripcion}
                onChange={(e) =>
                  setGastoForm((prev) => ({ ...prev, descripcion: e.target.value }))
                }
                className={inputClassName}
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="onb-gasto-monto"
                className="block text-sm font-medium text-slate-300"
              >
                Monto mensual
              </label>
              <MontoInput
                id="onb-gasto-monto"
                value={gastoForm.monto}
                onChange={(value) =>
                  setGastoForm((prev) => ({ ...prev, monto: value }))
                }
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="onb-gasto-cuenta"
                className="block text-sm font-medium text-slate-300"
              >
                Cuenta de pago
              </label>
              <Select
                id="onb-gasto-cuenta"
                value={gastoForm.cuenta_id}
                onChange={(cuenta_id) =>
                  setGastoForm((prev) => ({ ...prev, cuenta_id }))
                }
                options={cuentaOptions.map((option) => ({
                  value: option.id,
                  label: option.label,
                }))}
                required
              />
            </div>

            <div className={formSubmitClassName}>
              <button type="submit" className={`w-full ${buttonGhostSmClassName}`}>
                Añadir gasto
              </button>
            </div>
          </form>

          <div className={`${formSubmitClassName} flex gap-2`}>
            <button
              type="button"
              onClick={() => goToStep(2)}
              className={buttonGhostSmFlexClassName}
            >
              Atrás
            </button>
            <button
              type="button"
              onClick={handleStep3Next}
              className={buttonPrimaryFlexClassName}
            >
              {gastosFijos.length === 0 ? 'Omitir' : 'Continuar'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
