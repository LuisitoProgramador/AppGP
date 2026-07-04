import { formatCurrency } from '../../utils/format/formatCurrency'
import { parseMontoValue } from '../../utils/format/montoInput'
import {
  buttonGhostSmFlexClassName,
  buttonPrimaryFlexClassName,
  cardClassName,
  formSubmitClassName,
  formWithKeyboardClassName,
  inputClassName,
} from '../ui/formStyles'
import MontoInput from '../ui/MontoInput'
import type { OnboardingFlowState } from './useOnboardingFlow'

type OnboardingStepCuentasProps = Pick<
  OnboardingFlowState,
  | 'cuentasLiquidas'
  | 'tarjetas'
  | 'cuentaLiquidaForm'
  | 'setCuentaLiquidaForm'
  | 'showCuentaLiquidaForm'
  | 'setShowCuentaLiquidaForm'
  | 'tarjetaForm'
  | 'setTarjetaForm'
  | 'showTarjetaForm'
  | 'setShowTarjetaForm'
  | 'totalCuentas'
  | 'goToStep'
  | 'handleStep2Next'
  | 'handleAddCuentaLiquida'
  | 'removeCuentaLiquida'
  | 'handleAddTarjeta'
  | 'removeTarjeta'
>

export default function OnboardingStepCuentas({
  cuentasLiquidas,
  tarjetas,
  cuentaLiquidaForm,
  setCuentaLiquidaForm,
  showCuentaLiquidaForm,
  setShowCuentaLiquidaForm,
  tarjetaForm,
  setTarjetaForm,
  showTarjetaForm,
  setShowTarjetaForm,
  totalCuentas,
  goToStep,
  handleStep2Next,
  handleAddCuentaLiquida,
  removeCuentaLiquida,
  handleAddTarjeta,
  removeTarjeta,
}: OnboardingStepCuentasProps) {
  return (
    <div className={cardClassName}>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-white">Tus cuentas</h2>
        <p className="text-sm text-slate-400">
          Crea al menos una cuenta para asignar tus gastos fijos en el siguiente paso
        </p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-slate-200">Cuentas de débito o ahorro</h3>
          <p className="text-xs text-slate-500">
            El saldo actual cuenta como patrimonio líquido en tu dashboard
          </p>
        </div>

        {cuentasLiquidas.length > 0 && (
          <div className="grid gap-2">
            {cuentasLiquidas.map((cuenta) => (
              <div
                key={cuenta.id}
                className="flex items-center justify-between rounded-xl border border-slate-700/60 bg-slate-900/50 px-3 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-white">{cuenta.nombre}</p>
                  <p className="text-xs text-pulso-accent-muted">
                    Saldo: {formatCurrency(parseMontoValue(cuenta.saldo_actual) || 0)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeCuentaLiquida(cuenta.id)}
                  aria-label={`Eliminar ${cuenta.nombre}`}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-red-500/10 hover:text-red-400"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {!showCuentaLiquidaForm ? (
          <button
            type="button"
            onClick={() => setShowCuentaLiquidaForm(true)}
            className="w-full rounded-xl border border-dashed border-slate-600 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-pulso-accent/50 hover:text-white"
          >
            + Añadir cuenta de débito o ahorro
          </button>
        ) : (
          <form
            onSubmit={handleAddCuentaLiquida}
            className={`space-y-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-4 ${formWithKeyboardClassName}`}
          >
            <div className="space-y-2">
              <label
                htmlFor="onb-cuenta-nombre"
                className="block text-sm font-medium text-slate-300"
              >
                Nombre
              </label>
              <input
                id="onb-cuenta-nombre"
                type="text"
                maxLength={60}
                placeholder="Ej. Cuenta 1, Ahorro"
                value={cuentaLiquidaForm.nombre}
                onChange={(e) =>
                  setCuentaLiquidaForm((prev) => ({ ...prev, nombre: e.target.value }))
                }
                className={inputClassName}
                required
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="onb-cuenta-saldo"
                className="block text-sm font-medium text-slate-300"
              >
                Saldo actual
              </label>
              <MontoInput
                id="onb-cuenta-saldo"
                value={cuentaLiquidaForm.saldo_actual}
                onChange={(value) =>
                  setCuentaLiquidaForm((prev) => ({ ...prev, saldo_actual: value }))
                }
                placeholder="0"
              />
            </div>

            <div className={formSubmitClassName}>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCuentaLiquidaForm(false)
                    setCuentaLiquidaForm({ nombre: '', saldo_actual: '' })
                  }}
                  className={buttonGhostSmFlexClassName}
                >
                  Cancelar
                </button>
                <button type="submit" className={buttonPrimaryFlexClassName}>
                  Guardar cuenta
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      <div className="space-y-3 border-t border-slate-700/60 pt-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-slate-200">Tarjetas de crédito</h3>
        </div>

        {tarjetas.length > 0 && (
          <div className="grid gap-2">
            {tarjetas.map((tarjeta) => (
              <div
                key={tarjeta.id}
                className="flex items-center justify-between rounded-xl border border-slate-700/60 bg-slate-900/50 px-3 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-white">{tarjeta.nombre}</p>
                  {tarjeta.limite_credito && (
                    <p className="text-xs text-slate-400">
                      Límite: {formatCurrency(parseMontoValue(tarjeta.limite_credito))}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeTarjeta(tarjeta.id)}
                  aria-label={`Eliminar ${tarjeta.nombre}`}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-red-500/10 hover:text-red-400"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {!showTarjetaForm ? (
          <button
            type="button"
            onClick={() => setShowTarjetaForm(true)}
            className="w-full rounded-xl border border-dashed border-slate-600 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-pulso-accent/50 hover:text-white"
          >
            + Añadir tarjeta
          </button>
        ) : (
          <form
            onSubmit={handleAddTarjeta}
            className={`space-y-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-4 ${formWithKeyboardClassName}`}
          >
            <div className="space-y-2">
              <label
                htmlFor="onb-tarjeta-nombre"
                className="block text-sm font-medium text-slate-300"
              >
                Nombre
              </label>
              <input
                id="onb-tarjeta-nombre"
                type="text"
                maxLength={60}
                placeholder="Ej. Tarjeta A, Crédito"
                value={tarjetaForm.nombre}
                onChange={(e) =>
                  setTarjetaForm((prev) => ({ ...prev, nombre: e.target.value }))
                }
                className={inputClassName}
                required
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="onb-tarjeta-limite"
                  className="block text-sm font-medium text-slate-300"
                >
                  Límite
                </label>
                <MontoInput
                  id="onb-tarjeta-limite"
                  value={tarjetaForm.limite_credito}
                  onChange={(value) =>
                    setTarjetaForm((prev) => ({ ...prev, limite_credito: value }))
                  }
                  placeholder="Opcional"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="onb-tarjeta-corte"
                  className="block text-sm font-medium text-slate-300"
                >
                  Día de corte
                </label>
                <input
                  id="onb-tarjeta-corte"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="31"
                  placeholder="Opcional"
                  value={tarjetaForm.dia_corte}
                  onChange={(e) =>
                    setTarjetaForm((prev) => ({ ...prev, dia_corte: e.target.value }))
                  }
                  className={inputClassName}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="onb-tarjeta-deuda"
                className="block text-sm font-medium text-slate-300"
              >
                Deuda actual
              </label>
              <MontoInput
                id="onb-tarjeta-deuda"
                value={tarjetaForm.saldo_actual}
                onChange={(value) =>
                  setTarjetaForm((prev) => ({ ...prev, saldo_actual: value }))
                }
                placeholder="0"
              />
            </div>

            <div className={formSubmitClassName}>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowTarjetaForm(false)
                    setTarjetaForm({
                      nombre: '',
                      limite_credito: '',
                      dia_corte: '',
                      saldo_actual: '0',
                    })
                  }}
                  className={buttonGhostSmFlexClassName}
                >
                  Cancelar
                </button>
                <button type="submit" className={buttonPrimaryFlexClassName}>
                  Guardar tarjeta
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {totalCuentas === 0 && (
        <p className="rounded-xl border border-pulso-warning/30 bg-pulso-warning/10 px-4 py-3 text-sm text-pulso-warning/90">
          Necesitas al menos una cuenta para continuar y asignar gastos fijos.
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => goToStep(1)}
          className={buttonGhostSmFlexClassName}
        >
          Atrás
        </button>
        <button
          type="button"
          onClick={handleStep2Next}
          disabled={totalCuentas === 0}
          className={buttonPrimaryFlexClassName}
        >
          Continuar
        </button>
      </div>
    </div>
  )
}
