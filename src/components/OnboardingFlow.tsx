import { type FormEvent, useState } from 'react'
import { useAuthContext } from '../contexts'
import {
  calcLimiteMensual,
  calcPrimerAhorro,
  completeOnboarding,
  guessCategoria,
  type OnboardingTarjeta,
} from '../services/onboarding'
import { formatCurrency } from '../utils/formatCurrency'
import { showError, showSuccess } from '../utils/toast'
import { validateDescripcion, validateMonto } from '../utils/validation'
import { cardClassName, inputClassName } from './formStyles'

const TOTAL_STEPS = 4

const DIAS_PAGO = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
] as const

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

  const [sueldoSemanal, setSueldoSemanal] = useState('')
  const [diaPago, setDiaPago] = useState<number>(5)
  const [porcentajeAhorro, setPorcentajeAhorro] = useState(15)

  const [gastosFijos, setGastosFijos] = useState<GastoFijoDraft[]>([])
  const [gastoForm, setGastoForm] = useState({ descripcion: '', monto: '' })

  const [tarjetas, setTarjetas] = useState<TarjetaDraft[]>([])
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

  function handleStep1Next() {
    const montoError = validateMonto(sueldoSemanal)
    if (montoError) {
      showError(montoError)
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

  async function handleFinish() {
    if (!user) {
      showError('Debes iniciar sesión.')
      return
    }

    if (!navigator.onLine) {
      showError('Sin conexión. Conéctate a internet para completar la configuración.')
      return
    }

    const montoError = validateMonto(sueldoSemanal)
    if (montoError) {
      showError(montoError)
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

    const { error } = await completeOnboarding(user.id, {
      sueldoSemanal: Number(sueldoSemanal),
      diaPago,
      porcentajeAhorro,
      gastosFijos: gastosFijos.map((g) => ({
        descripcion: g.descripcion,
        monto: Number(g.monto),
        categoria: guessCategoria(g.descripcion),
        dia_mes: 1,
      })),
      tarjetas: tarjetasData,
    })

    setGuardando(false)

    if (error) {
      showError(`Error al guardar: ${error}`)
      return
    }

    const primerAhorro = calcPrimerAhorro(Number(sueldoSemanal), porcentajeAhorro)
    showSuccess(
      primerAhorro > 0
        ? `¡Listo! Ya registramos tu primer ahorro de ${formatCurrency(primerAhorro)}.`
        : '¡Configuración completada!',
    )
    onComplete()
  }

  const sueldoNum = Number(sueldoSemanal) || 0
  const limitePreview =
    sueldoNum > 0 ? calcLimiteMensual(sueldoNum, porcentajeAhorro) : null
  const ahorroPreview = sueldoNum > 0 ? calcPrimerAhorro(sueldoNum, porcentajeAhorro) : null

  const stepTitles = ['Tus ingresos', 'Gastos fijos', 'Tu ahorro', 'Tarjetas']

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
              <h2 className="text-lg font-semibold text-white">¿Cuánto ganas a la semana?</h2>
              <p className="text-sm text-slate-400">
                Usaremos esto para calcular tu presupuesto mensual
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="onb-sueldo" className="block text-sm font-medium text-slate-300">
                Sueldo semanal
              </label>
              <input
                id="onb-sueldo"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={sueldoSemanal}
                onChange={(e) => setSueldoSemanal(e.target.value)}
                className={inputClassName}
                autoFocus
              />
            </div>

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
            </div>

            <button
              type="button"
              onClick={handleStep1Next}
              className="w-full rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 active:scale-[0.98]"
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

            <form onSubmit={handleAddGasto} className="space-y-3 border-t border-slate-700/60 pt-4">
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
                className="w-full rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-700/60"
              >
                Añadir gasto
              </button>
            </form>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => goToStep(1)}
                className="flex-1 rounded-xl border border-slate-600 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-700/60"
              >
                Atrás
              </button>
              <button
                type="button"
                onClick={() => goToStep(3)}
                className="flex-1 rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-400"
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

            {limitePreview != null && (
              <p className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-300">
                Tu presupuesto mensual para gastar será de{' '}
                <strong className="text-white">{formatCurrency(limitePreview)}</strong>
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => goToStep(2)}
                className="flex-1 rounded-xl border border-slate-600 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-700/60"
              >
                Atrás
              </button>
              <button
                type="button"
                onClick={() => goToStep(4)}
                className="flex-1 rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-400"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className={cardClassName}>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-white">Tarjetas de crédito</h2>
              <p className="text-sm text-slate-400">
                Opcional — añade tus tarjetas para un mejor control
              </p>
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
              <form onSubmit={handleAddTarjeta} className="space-y-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-4">
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
                    className="flex-1 rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-700/60"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400"
                  >
                    Guardar tarjeta
                  </button>
                </div>
              </form>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => goToStep(3)}
                className="flex-1 rounded-xl border border-slate-600 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-700/60"
              >
                Atrás
              </button>
              <button
                type="button"
                onClick={handleFinish}
                disabled={guardando}
                className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-60"
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
