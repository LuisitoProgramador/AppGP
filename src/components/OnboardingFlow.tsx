import { type FormEvent, useState } from 'react'
import { useAuthContext } from '../contexts'
import {
  calcIngresoMensualTotal,
  calcLimiteMensual,
  calcPrimerAhorro,
  completeOnboarding,
  guessCategoria,
  type OnboardingCuentaLiquida,
  type OnboardingTarjeta,
} from '../services/onboarding'
import { formatCurrency } from '../utils/formatCurrency'
import { isOnline } from '../utils/network'
import { showError, showSuccess } from '../utils/toast'
import { validateDescripcion, validateMonto } from '../utils/validation'
import {
  buttonEmeraldFlexClassName,
  buttonGhostFlexClassName,
  buttonGhostSmClassName,
  buttonGhostSmFlexClassName,
  buttonPrimaryClassName,
  buttonPrimaryFlexClassName,
  buttonVioletFlexClassName,
  buttonVioletClassName,
  cardClassName,
  formSubmitStickyClassName,
  formWithKeyboardClassName,
  inputClassName,
} from './formStyles'

import { DIAS_PAGO } from '../constants/diasPago'

const TOTAL_STEPS = 4

const SUGERENCIAS = ['Renta', 'Internet', 'Netflix']

interface GastoFijoDraft {
  id: string
  descripcion: string
  monto: string
}

interface TarjetaDraft {
  id: string
  nombre: string
  limite_credito: string
  dia_corte: string
  saldo_actual: string
}

interface CuentaLiquidaDraft {
  id: string
  nombre: string
  saldo_actual: string
}

interface OnboardingFlowProps {
  onComplete: () => void
}

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i + 1 === step
              ? 'w-8 bg-blue-500'
              : i + 1 < step
                ? 'w-4 bg-blue-500/60'
                : 'w-4 bg-slate-700'
          }`}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const { user } = useAuthContext()
  const [step, setStep] = useState(1)
  const [animating, setAnimating] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const [sueldoMensual, setSueldoMensual] = useState('')
  const [ingresosExtras, setIngresosExtras] = useState('')
  const [diaPago, setDiaPago] = useState<number>(5)
  const [porcentajeAhorro, setPorcentajeAhorro] = useState(15)

  const [gastosFijos, setGastosFijos] = useState<GastoFijoDraft[]>([])
  const [gastoForm, setGastoForm] = useState({ descripcion: '', monto: '' })

  const [tarjetas, setTarjetas] = useState<TarjetaDraft[]>([])
  const [cuentasLiquidas, setCuentasLiquidas] = useState<CuentaLiquidaDraft[]>([])
  const [cuentaLiquidaForm, setCuentaLiquidaForm] = useState({
    nombre: '',
    saldo_actual: '',
  })
  const [showCuentaLiquidaForm, setShowCuentaLiquidaForm] = useState(false)
  const [tarjetaForm, setTarjetaForm] = useState({
    nombre: '',
    limite_credito: '',
    dia_corte: '',
    saldo_actual: '0',
  })
  const [showTarjetaForm, setShowTarjetaForm] = useState(false)

  function goToStep(next: number) {
    setAnimating(true)
    setTimeout(() => {
      setStep(next)
      setAnimating(false)
    }, 150)
  }

  function validateIngresosExtrasOpcional(value: string): string | null {
    if (!value.trim()) return null
    const monto = Number(value)
    if (Number.isNaN(monto) || monto < 0) {
      return 'Los ingresos extras deben ser un número válido mayor o igual a 0.'
    }
    return null
  }

  function handleStep1Next() {
    const montoError = validateMonto(sueldoMensual)
    if (montoError) {
      showError(montoError)
      return
    }
    const extrasError = validateIngresosExtrasOpcional(ingresosExtras)
    if (extrasError) {
      showError(extrasError)
      return
    }
    goToStep(2)
  }

  function handleAddGasto(event: FormEvent) {
    event.preventDefault()

    const montoError = validateMonto(gastoForm.monto)
    if (montoError) {
      showError(montoError)
      return
    }

    const descripcionError = validateDescripcion(gastoForm.descripcion)
    if (descripcionError) {
      showError(descripcionError)
      return
    }

    setGastosFijos((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        descripcion: gastoForm.descripcion.trim(),
        monto: gastoForm.monto,
      },
    ])
    setGastoForm({ descripcion: '', monto: '' })
  }

  function addSugerencia(nombre: string) {
    if (gastosFijos.some((g) => g.descripcion.toLowerCase() === nombre.toLowerCase())) return
    setGastoForm({ descripcion: nombre, monto: '' })
  }

  function removeGasto(id: string) {
    setGastosFijos((prev) => prev.filter((g) => g.id !== id))
  }

  function handleAddTarjeta(event: FormEvent) {
    event.preventDefault()

    const nombre = tarjetaForm.nombre.trim()
    if (!nombre) {
      showError('El nombre de la tarjeta es obligatorio.')
      return
    }

    const saldo = Number(tarjetaForm.saldo_actual)
    if (Number.isNaN(saldo) || saldo < 0) {
      showError('La deuda actual debe ser un número válido.')
      return
    }

    let limite: string | null = tarjetaForm.limite_credito
    if (limite.trim()) {
      const limiteNum = Number(limite)
      if (Number.isNaN(limiteNum) || limiteNum <= 0) {
        showError('El límite de crédito debe ser mayor a 0.')
        return
      }
    }

    let diaCorte: string | null = tarjetaForm.dia_corte
    if (diaCorte.trim()) {
      const dia = Number(diaCorte)
      if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
        showError('El día de corte debe estar entre 1 y 31.')
        return
      }
    }

    setTarjetas((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        ...tarjetaForm,
        nombre,
      },
    ])
    setTarjetaForm({ nombre: '', limite_credito: '', dia_corte: '', saldo_actual: '0' })
    setShowTarjetaForm(false)
  }

  function removeTarjeta(id: string) {
    setTarjetas((prev) => prev.filter((t) => t.id !== id))
  }

  function handleAddCuentaLiquida(event: FormEvent) {
    event.preventDefault()

    const nombre = cuentaLiquidaForm.nombre.trim()
    if (!nombre) {
      showError('El nombre de la cuenta es obligatorio.')
      return
    }

    const saldo = Number(cuentaLiquidaForm.saldo_actual)
    if (Number.isNaN(saldo) || saldo < 0) {
      showError('El saldo actual debe ser un número válido mayor o igual a 0.')
      return
    }

    setCuentasLiquidas((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        nombre,
        saldo_actual: cuentaLiquidaForm.saldo_actual,
      },
    ])
    setCuentaLiquidaForm({ nombre: '', saldo_actual: '' })
    setShowCuentaLiquidaForm(false)
  }

  function removeCuentaLiquida(id: string) {
    setCuentasLiquidas((prev) => prev.filter((c) => c.id !== id))
  }

  async function handleFinish() {
    if (!user) {
      showError('Debes iniciar sesión.')
      return
    }

    if (!isOnline()) {
      showError('Sin conexión. Conéctate a internet para completar la configuración.')
      return
    }

    const montoError = validateMonto(sueldoMensual)
    if (montoError) {
      showError(montoError)
      goToStep(1)
      return
    }

    const extrasError = validateIngresosExtrasOpcional(ingresosExtras)
    if (extrasError) {
      showError(extrasError)
      goToStep(1)
      return
    }

    setGuardando(true)

    const tarjetasData: OnboardingTarjeta[] = tarjetas.map((t) => ({
      nombre: t.nombre.trim(),
      saldo_actual: Number(t.saldo_actual) || 0,
      limite_credito: t.limite_credito.trim() ? Number(t.limite_credito) : null,
      dia_corte: t.dia_corte.trim() ? Number(t.dia_corte) : null,
    }))

    const cuentasLiquidasData: OnboardingCuentaLiquida[] = cuentasLiquidas.map((c) => ({
      nombre: c.nombre.trim(),
      saldo_actual: Number(c.saldo_actual) || 0,
    }))

    const { error } = await completeOnboarding(user.id, {
      sueldoMensual: Number(sueldoMensual),
      ingresosExtras: ingresosExtras.trim() ? Number(ingresosExtras) : 0,
      diaPago,
      porcentajeAhorro,
      gastosFijos: gastosFijos.map((g) => ({
        descripcion: g.descripcion,
        monto: Number(g.monto),
        categoria: guessCategoria(g.descripcion),
        dia_mes: 1,
      })),
      tarjetas: tarjetasData,
      cuentasLiquidas: cuentasLiquidasData,
    })

    setGuardando(false)

    if (error) {
      showError(`Error al guardar: ${error}`)
      return
    }

    const primerAhorro = calcPrimerAhorro(Number(sueldoMensual), porcentajeAhorro)
    showSuccess(
      primerAhorro > 0
        ? `¡Listo! Ya registramos tu primer ahorro de ${formatCurrency(primerAhorro)}.`
        : '¡Configuración completada!',
    )
    onComplete()
  }

  const sueldoNum = Number(sueldoMensual) || 0
  const extrasNum = ingresosExtras.trim() ? Number(ingresosExtras) || 0 : 0
  const ingresoMensualTotal =
    sueldoNum > 0 ? calcIngresoMensualTotal(sueldoNum, extrasNum) : null
  const limitePreview =
    sueldoNum > 0 ? calcLimiteMensual(sueldoNum, porcentajeAhorro, extrasNum) : null
  const ahorroPreview = sueldoNum > 0 ? calcPrimerAhorro(sueldoNum, porcentajeAhorro) : null

  const stepTitles = ['Tus ingresos', 'Gastos fijos', 'Tu ahorro', 'Tus cuentas']

  return (
    <section className="space-y-6">
      <div className="space-y-3 text-center">
        <p className="text-sm font-medium text-blue-400">
          Paso {step} de {TOTAL_STEPS}
        </p>
        <h1 className="text-2xl font-bold">Configura tu presupuesto</h1>
        <p className="text-sm text-slate-400">{stepTitles[step - 1]}</p>
        <StepIndicator step={step} />
      </div>

      <div
        className={`transition-all duration-300 ease-out ${
          animating ? 'translate-x-2 opacity-0' : 'translate-x-0 opacity-100'
        }`}
      >
        {step === 1 && (
          <div className={cardClassName}>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-white">¿Cuánto ganas al mes?</h2>
              <p className="text-sm text-slate-400">
                Ingresa tu sueldo mensual; nosotros calculamos la planeación semanal
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="onb-sueldo" className="block text-sm font-medium text-slate-300">
                Sueldo mensual
              </label>
              <input
                id="onb-sueldo"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={sueldoMensual}
                onChange={(e) => setSueldoMensual(e.target.value)}
                className={inputClassName}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="onb-extras" className="block text-sm font-medium text-slate-300">
                Ingresos extras mensuales estimados
                <span className="ml-1 font-normal text-slate-500">(opcional)</span>
              </label>
              <input
                id="onb-extras"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="Bonos, ventas, intereses de NU..."
                value={ingresosExtras}
                onChange={(e) => setIngresosExtras(e.target.value)}
                className={inputClassName}
              />
              <p className="text-xs text-slate-500">
                Bonos, ventas, intereses de NU u otros ingresos recurrentes del mes
              </p>
            </div>

            {ingresoMensualTotal != null && ingresoMensualTotal > 0 && (
              <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                Total mensual disponible para presupuesto:{' '}
                <strong className="text-white">{formatCurrency(ingresoMensualTotal)}</strong>
              </p>
            )}

            <div className="space-y-2">
              <label htmlFor="onb-dia-pago" className="block text-sm font-medium text-slate-300">
                Día de pago
              </label>
              <select
                id="onb-dia-pago"
                value={diaPago}
                onChange={(e) => setDiaPago(Number(e.target.value))}
                className={inputClassName}
              >
                {DIAS_PAGO.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">
                El día de la semana en que recibes tu sueldo semanal
              </p>
            </div>

            <button
              type="button"
              onClick={handleStep1Next}
              className={buttonPrimaryClassName}
            >
              Continuar
            </button>
          </div>
        )}

        {step === 2 && (
          <div className={cardClassName}>
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
                      <p className="truncate text-sm font-medium text-white">{gasto.descripcion}</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-slate-200">
                      {formatCurrency(Number(gasto.monto))}
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
                  className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-blue-500/50 hover:text-white"
                >
                  + {nombre}
                </button>
              ))}
            </div>

            <form onSubmit={handleAddGasto} className={`space-y-3 border-t border-slate-700/60 pt-4 ${formWithKeyboardClassName}`}>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  maxLength={200}
                  placeholder="Descripción"
                  value={gastoForm.descripcion}
                  onChange={(e) =>
                    setGastoForm((prev) => ({ ...prev, descripcion: e.target.value }))
                  }
                  className={inputClassName}
                />
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="Monto"
                  value={gastoForm.monto}
                  onChange={(e) => setGastoForm((prev) => ({ ...prev, monto: e.target.value }))}
                  className={inputClassName}
                />
              </div>
              <button
                type="submit"
                className={`w-full ${buttonGhostSmClassName}`}
              >
                Añadir gasto
              </button>
            </form>

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
                onClick={() => goToStep(3)}
                className={buttonPrimaryFlexClassName}
              >
                {gastosFijos.length === 0 ? 'Omitir' : 'Continuar'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className={cardClassName}>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-white">¿Cuánto quieres ahorrar?</h2>
              <p className="text-sm text-slate-400">
                Reservaremos este porcentaje de tu sueldo cada semana
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-emerald-400">{porcentajeAhorro}%</span>
                {ahorroPreview != null && ahorroPreview > 0 && (
                  <span className="text-sm text-slate-400">
                    ≈ {formatCurrency(ahorroPreview)}/semana
                  </span>
                )}
              </div>

              <input
                type="range"
                min={5}
                max={50}
                step={5}
                value={porcentajeAhorro}
                onChange={(e) => setPorcentajeAhorro(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-emerald-500"
                aria-label="Porcentaje de ahorro semanal"
              />

              <div className="flex justify-between text-xs text-slate-500">
                <span>5%</span>
                <span>50%</span>
              </div>
            </div>

            {limitePreview != null && ingresoMensualTotal != null && (
              <p className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-300">
                Con {porcentajeAhorro}% de ahorro, tu presupuesto mensual para gastar será de{' '}
                <strong className="text-white">{formatCurrency(limitePreview)}</strong>
                {extrasNum > 0 && (
                  <span className="block mt-1 text-xs text-blue-200/80">
                    Basado en {formatCurrency(ingresoMensualTotal)} de ingreso mensual total
                  </span>
                )}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => goToStep(2)}
                className={buttonGhostSmFlexClassName}
              >
                Atrás
              </button>
              <button
                type="button"
                onClick={() => goToStep(4)}
                className={buttonPrimaryFlexClassName}
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className={cardClassName}>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-white">Tus cuentas</h2>
              <p className="text-sm text-slate-400">
                Opcional — registra débito/ahorro y tarjetas para un control más real
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
                        <p className="text-xs text-emerald-400">
                          Saldo: {formatCurrency(Number(cuenta.saldo_actual) || 0)}
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
                  className="w-full rounded-xl border border-dashed border-slate-600 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-emerald-500/50 hover:text-white"
                >
                  + Añadir cuenta (NU, débito...)
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
                      placeholder="Ej. NU, BBVA débito..."
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
                    <input
                      id="onb-cuenta-saldo"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={cuentaLiquidaForm.saldo_actual}
                      onChange={(e) =>
                        setCuentaLiquidaForm((prev) => ({ ...prev, saldo_actual: e.target.value }))
                      }
                      className={inputClassName}
                    />
                  </div>

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
                    <button type="submit" className={buttonEmeraldFlexClassName}>
                      Guardar cuenta
                    </button>
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
                          Límite: {formatCurrency(Number(tarjeta.limite_credito))}
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
                className="w-full rounded-xl border border-dashed border-slate-600 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-blue-500/50 hover:text-white"
              >
                + Añadir tarjeta
              </button>
            ) : (
              <form onSubmit={handleAddTarjeta} className={`space-y-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-4 ${formWithKeyboardClassName}`}>
                <div className="space-y-2">
                  <label htmlFor="onb-tarjeta-nombre" className="block text-sm font-medium text-slate-300">
                    Nombre
                  </label>
                  <input
                    id="onb-tarjeta-nombre"
                    type="text"
                    maxLength={60}
                    placeholder="Ej. Banamex, BBVA..."
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
                    <label htmlFor="onb-tarjeta-limite" className="block text-sm font-medium text-slate-300">
                      Límite
                    </label>
                    <input
                      id="onb-tarjeta-limite"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      placeholder="Opcional"
                      value={tarjetaForm.limite_credito}
                      onChange={(e) =>
                        setTarjetaForm((prev) => ({ ...prev, limite_credito: e.target.value }))
                      }
                      className={inputClassName}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="onb-tarjeta-corte" className="block text-sm font-medium text-slate-300">
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
                  <label htmlFor="onb-tarjeta-deuda" className="block text-sm font-medium text-slate-300">
                    Deuda actual
                  </label>
                  <input
                    id="onb-tarjeta-deuda"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={tarjetaForm.saldo_actual}
                    onChange={(e) =>
                      setTarjetaForm((prev) => ({ ...prev, saldo_actual: e.target.value }))
                    }
                    className={inputClassName}
                  />
                </div>

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
                  <button
                    type="submit"
                    className={buttonVioletFlexClassName}
                  >
                    Guardar tarjeta
                  </button>
                </div>
              </form>
            )}
            </div>

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
                className={buttonEmeraldFlexClassName}
              >
                {guardando ? 'Configurando...' : 'Finalizar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
