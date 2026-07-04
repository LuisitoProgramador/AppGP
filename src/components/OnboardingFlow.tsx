import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useAuthContext } from '../contexts'
import {
  calcLimiteMensual,
  calcPrimerAhorro,
  completeOnboarding,
  guessCategoria,
  type OnboardingCuentaLiquida,
  type OnboardingTarjeta,
} from '../services/onboarding'
import { formatCurrency } from '../utils/formatCurrency'
import { parseMontoValue } from '../utils/montoInput'
import { isOnline } from '../utils/network'
import { showError, showSuccess } from '../utils/toast'
import { validateDescripcion, validateMonto } from '../utils/validation'
import {
  buttonPrimaryFlexClassName,
  buttonGhostSmClassName,
  buttonGhostSmFlexClassName,
  buttonPrimaryClassName,
  cardClassName,
  formWithKeyboardClassName,
  inputClassName,
} from './formStyles'
import Select from './Select'
import MontoInput from './MontoInput'

import { DIAS_PAGO } from '../constants/diasPago'
import {
  PORCENTAJE_AHORRO_DEFAULT,
  PORCENTAJE_AHORRO_MAX,
  PORCENTAJE_AHORRO_MIN,
  PORCENTAJE_AHORRO_STEP,
} from '../constants/porcentajeAhorro'

const TOTAL_STEPS = 4

const SUGERENCIAS = ['Renta', 'Internet', 'Suscripción']

interface GastoFijoDraft {
  id: string
  descripcion: string
  monto: string
  cuenta_id: string
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

interface CuentaOption {
  id: string
  label: string
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

const STEP_TITLES = ['Tus ingresos', 'Tus cuentas', 'Gastos fijos', 'Tu ahorro']

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const { user } = useAuthContext()
  const [step, setStep] = useState(1)
  const [animating, setAnimating] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const [sueldoMensual, setSueldoMensual] = useState('')
  const [diaPago, setDiaPago] = useState<number>(5)
  const [porcentajeAhorro, setPorcentajeAhorro] = useState(PORCENTAJE_AHORRO_DEFAULT)

  const [gastosFijos, setGastosFijos] = useState<GastoFijoDraft[]>([])
  const [gastoForm, setGastoForm] = useState({
    descripcion: '',
    monto: '',
    cuenta_id: '',
  })

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

  const cuentaOptions = useMemo<CuentaOption[]>(
    () => [
      ...cuentasLiquidas.map((cuenta) => ({
        id: cuenta.id,
        label: `Débito · ${cuenta.nombre}`,
      })),
      ...tarjetas.map((tarjeta) => ({
        id: tarjeta.id,
        label: `Crédito · ${tarjeta.nombre}`,
      })),
    ],
    [cuentasLiquidas, tarjetas],
  )

  const totalCuentas = cuentaOptions.length

  const cuentaLabelById = useMemo(() => {
    const map = new Map<string, string>()
    for (const option of cuentaOptions) {
      map.set(option.id, option.label)
    }
    return map
  }, [cuentaOptions])

  useEffect(() => {
    if (step !== 3 || cuentaOptions.length === 0) return

    setGastoForm((prev) => {
      if (prev.cuenta_id && cuentaOptions.some((option) => option.id === prev.cuenta_id)) {
        return prev
      }
      return { ...prev, cuenta_id: cuentaOptions[0].id }
    })
  }, [step, cuentaOptions])

  function goToStep(next: number) {
    setAnimating(true)
    setTimeout(() => {
      setStep(next)
      setAnimating(false)
    }, 150)
  }

  function handleStep1Next() {
    const montoError = validateMonto(sueldoMensual)
    if (montoError) {
      showError(montoError)
      return
    }
    goToStep(2)
  }

  function handleStep2Next() {
    if (totalCuentas === 0) {
      showError('Añade al menos una cuenta de débito o crédito para continuar.')
      return
    }
    goToStep(3)
  }

  function handleStep3Next() {
    if (totalCuentas === 0) {
      showError('Configura tus cuentas antes de registrar gastos fijos.')
      goToStep(2)
      return
    }
    goToStep(4)
  }

  function handleAddGasto(event: FormEvent) {
    event.preventDefault()

    const descripcionError = validateDescripcion(gastoForm.descripcion)
    if (descripcionError) {
      showError(descripcionError)
      return
    }

    const montoError = validateMonto(gastoForm.monto)
    if (montoError) {
      showError(montoError)
      return
    }

    if (!gastoForm.cuenta_id) {
      showError('Selecciona la cuenta de pago del gasto fijo.')
      return
    }

    setGastosFijos((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        descripcion: gastoForm.descripcion.trim(),
        monto: gastoForm.monto,
        cuenta_id: gastoForm.cuenta_id,
      },
    ])
    setGastoForm({
      descripcion: '',
      monto: '',
      cuenta_id: gastoForm.cuenta_id,
    })
  }

  function addSugerencia(nombre: string) {
    if (gastosFijos.some((g) => g.descripcion.toLowerCase() === nombre.toLowerCase())) return
    setGastoForm((prev) => ({
      descripcion: nombre,
      monto: prev.monto,
      cuenta_id: prev.cuenta_id || cuentaOptions[0]?.id || '',
    }))
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

    const saldo = parseMontoValue(tarjetaForm.saldo_actual)
    if (Number.isNaN(saldo) || saldo < 0) {
      showError('La deuda actual debe ser un número válido.')
      return
    }

    const limite = tarjetaForm.limite_credito
    if (limite.trim()) {
      const limiteNum = parseMontoValue(limite)
      if (Number.isNaN(limiteNum) || limiteNum <= 0) {
        showError('El límite de crédito debe ser mayor a 0.')
        return
      }
    }

    const diaCorte = tarjetaForm.dia_corte
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

    const saldo = parseMontoValue(cuentaLiquidaForm.saldo_actual)
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

    if (totalCuentas === 0) {
      showError('Debes configurar al menos una cuenta antes de finalizar.')
      goToStep(2)
      return
    }

    setGuardando(true)

    const tarjetasData: OnboardingTarjeta[] = tarjetas.map((t) => ({
      draftId: t.id,
      nombre: t.nombre.trim(),
      saldo_actual: parseMontoValue(t.saldo_actual) || 0,
      limite_credito: t.limite_credito.trim() ? parseMontoValue(t.limite_credito) : null,
      dia_corte: t.dia_corte.trim() ? Number(t.dia_corte) : null,
    }))

    const cuentasLiquidasData: OnboardingCuentaLiquida[] = cuentasLiquidas.map((c) => ({
      draftId: c.id,
      nombre: c.nombre.trim(),
      saldo_actual: parseMontoValue(c.saldo_actual) || 0,
    }))

    const { error } = await completeOnboarding(user.id, {
      sueldoMensual: parseMontoValue(sueldoMensual),
      diaPago,
      porcentajeAhorro,
      gastosFijos: gastosFijos.map((g) => ({
        descripcion: g.descripcion,
        monto: parseMontoValue(g.monto),
        categoria: guessCategoria(g.descripcion),
        dia_mes: 1,
        cuenta_id: g.cuenta_id,
      })),
      tarjetas: tarjetasData,
      cuentasLiquidas: cuentasLiquidasData,
    })

    setGuardando(false)

    if (error) {
      showError(`Error al guardar: ${error}`)
      return
    }

    const primerAhorro = calcPrimerAhorro(parseMontoValue(sueldoMensual), porcentajeAhorro)
    showSuccess(
      primerAhorro > 0
        ? `¡Listo! Ya registramos tu primer ahorro de ${formatCurrency(primerAhorro)}.`
        : '¡Configuración completada!',
    )
    onComplete()
  }

  const sueldoNum = parseMontoValue(sueldoMensual) || 0
  const limitePreview =
    sueldoNum > 0 ? calcLimiteMensual(sueldoNum, porcentajeAhorro) : null
  const ahorroPreview = sueldoNum > 0 ? calcPrimerAhorro(sueldoNum, porcentajeAhorro) : null

  return (
    <section className="space-y-6">
      <div className="space-y-3 text-center">
        <p className="text-sm font-medium text-blue-400">
          Paso {step} de {TOTAL_STEPS}
        </p>
        <h1 className="text-2xl font-bold">Configura tu presupuesto</h1>
        <p className="text-sm text-slate-400">{STEP_TITLES[step - 1]}</p>
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
              <MontoInput
                id="onb-sueldo"
                value={sueldoMensual}
                onChange={setSueldoMensual}
                placeholder="0"
                autoFocus
              />
            </div>

            {sueldoNum > 0 && (
              <p className="rounded-xl border border-pulso-accent/30 bg-pulso-accent/10 px-4 py-3 text-sm text-pulso-accent-muted">
                Ingreso base mensual:{' '}
                <strong className="text-white">{formatCurrency(sueldoNum)}</strong>
              </p>
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
                options={DIAS_PAGO.map(({ value, label }) => ({
                  value: String(value),
                  label,
                }))}
              />
              <p className="text-xs text-slate-500">
                El día de la semana en que recibes tu sueldo semanal
              </p>
            </div>

            <button type="button" onClick={handleStep1Next} className={buttonPrimaryClassName}>
              Continuar
            </button>
          </div>
        )}

        {step === 2 && (
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
                  className="w-full rounded-xl border border-dashed border-slate-600 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-blue-500/50 hover:text-white"
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
        )}

        {step === 3 && (
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
                      className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-blue-500/50 hover:text-white"
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

                  <button type="submit" className={`w-full ${buttonGhostSmClassName}`}>
                    Añadir gasto
                  </button>
                </form>

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
                    onClick={handleStep3Next}
                    className={buttonPrimaryFlexClassName}
                  >
                    {gastosFijos.length === 0 ? 'Omitir' : 'Continuar'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {step === 4 && (
          <div className={cardClassName}>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-white">¿Cuánto quieres ahorrar?</h2>
              <p className="text-sm text-slate-400">
                Reservaremos este porcentaje de tu sueldo cada semana
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
              <p className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-300">
                Con {porcentajeAhorro}% de ahorro, tu presupuesto mensual para gastar será de{' '}
                <strong className="text-white">{formatCurrency(limitePreview)}</strong>
                <span className="mt-1 block text-xs text-blue-200/80">
                  Basado en {formatCurrency(sueldoNum)} de sueldo mensual
                </span>
              </p>
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
        )}
      </div>
    </section>
  )
}
