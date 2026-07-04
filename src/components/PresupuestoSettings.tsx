import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useAuthContext, useGastosData } from '../contexts'
import { getPresupuesto, savePresupuestoFinanciero, applyLimiteCalculado } from '../services/presupuesto'
import { DIAS_PAGO } from '../constants/diasPago'
import { getDaysRemainingInMonth } from '../utils/date'
import {
  calcDiferenciaAhorroMensual,
  calcEstrategiaFinanciera,
  calcPrimerAhorro,
} from '../utils/finanzas'
import { formatCurrency } from '../utils/formatCurrency'
import { isOnline } from '../utils/network'
import { showError, showSuccess } from '../utils/toast'
import { validateMonto } from '../utils/validation'
import {
  buttonPrimaryClassName,
  buttonSecondaryClassName,
  formWithKeyboardClassName,
  inputClassName,
} from './formStyles'

function validateIngresosExtrasOpcional(value: string): string | null {
  if (!value.trim()) return null
  const monto = Number(value)
  if (Number.isNaN(monto) || monto < 0) {
    return 'Los ingresos extras deben ser un número válido mayor o igual a 0.'
  }
  return null
}

export default function PresupuestoSettings() {
  const { user } = useAuthContext()
  const { refreshKey, refresh } = useGastosData()

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [aplicandoLimite, setAplicandoLimite] = useState(false)

  const [limiteEsManual, setLimiteEsManual] = useState(false)
  const [limiteManualActual, setLimiteManualActual] = useState<number | null>(null)

  const [sueldoMensual, setSueldoMensual] = useState('')
  const [ingresosExtras, setIngresosExtras] = useState('')
  const [porcentajeAhorro, setPorcentajeAhorro] = useState(15)
  const [diaPago, setDiaPago] = useState(5)
  const [diaPagoInicial, setDiaPagoInicial] = useState(5)

  const [valoresIniciales, setValoresIniciales] = useState({
    sueldoMensual: 0,
    ingresosExtras: 0,
    porcentajeAhorro: 15,
  })

  useEffect(() => {
    if (!user) return

    let cancelled = false

    async function cargar() {
      setCargando(true)
      const presupuesto = await getPresupuesto(user.id)
      if (cancelled) return

      if (presupuesto?.sueldo_mensual != null) {
        const sueldo = presupuesto.sueldo_mensual
        const extras = presupuesto.ingresos_extras ?? 0
        const ahorro = presupuesto.porcentaje_ahorro ?? 15

        setSueldoMensual(String(sueldo))
        setIngresosExtras(extras > 0 ? String(extras) : '')
        setPorcentajeAhorro(ahorro)
        setDiaPago(presupuesto.dia_pago ?? 5)
        setDiaPagoInicial(presupuesto.dia_pago ?? 5)
        setLimiteEsManual(presupuesto.limite_es_manual)
        setLimiteManualActual(presupuesto.limite_es_manual ? presupuesto.limite_mensual : null)
        setValoresIniciales({
          sueldoMensual: sueldo,
          ingresosExtras: extras,
          porcentajeAhorro: ahorro,
        })
      }

      setCargando(false)
    }

    cargar()

    return () => {
      cancelled = true
    }
  }, [user, refreshKey])

  const sueldoNum = Number(sueldoMensual) || 0
  const extrasNum = ingresosExtras.trim() ? Number(ingresosExtras) || 0 : 0

  const estrategiaPreview = useMemo(() => {
    if (sueldoNum <= 0) return null
    return calcEstrategiaFinanciera({
      sueldoMensual: sueldoNum,
      ingresosExtras: extrasNum,
      porcentajeAhorro,
    })
  }, [sueldoNum, extrasNum, porcentajeAhorro])

  const ahorroSemanalPreview =
    sueldoNum > 0 ? calcPrimerAhorro(sueldoNum, porcentajeAhorro) : null

  const diferenciaAhorroMensual = useMemo(() => {
    if (sueldoNum <= 0) return null
    return calcDiferenciaAhorroMensual(
      valoresIniciales,
      { sueldoMensual: sueldoNum, ingresosExtras: extrasNum, porcentajeAhorro },
    )
  }, [sueldoNum, extrasNum, porcentajeAhorro, valoresIniciales])

  const presupuestoDiarioPreview = useMemo(() => {
    if (!estrategiaPreview) return null
    const dias = getDaysRemainingInMonth(new Date()) || 1
    return Math.round((estrategiaPreview.disponibleParaGasto / dias) * 100) / 100
  }, [estrategiaPreview])

  const hayCambios =
    sueldoNum !== valoresIniciales.sueldoMensual ||
    extrasNum !== valoresIniciales.ingresosExtras ||
    porcentajeAhorro !== valoresIniciales.porcentajeAhorro ||
    diaPago !== diaPagoInicial

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!user) return

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

    if (!isOnline()) {
      showError('Sin conexión. Conéctate a internet para actualizar tu estrategia financiera.')
      return
    }

    setGuardando(true)

    const { error, limiteManualPreservado } = await savePresupuestoFinanciero(user.id, {
      sueldo_mensual: sueldoNum,
      ingresos_extras: extrasNum,
      porcentaje_ahorro: porcentajeAhorro,
      dia_pago: diaPago,
    })

    setGuardando(false)

    if (error) {
      showError(`Error al guardar: ${error}`)
      return
    }

    setValoresIniciales({
      sueldoMensual: sueldoNum,
      ingresosExtras: extrasNum,
      porcentajeAhorro,
    })
    setDiaPagoInicial(diaPago)

    refresh()
    if (limiteManualPreservado && limiteManualActual != null) {
      showSuccess(
        `Estrategia actualizada. Tu límite manual de ${formatCurrency(limiteManualActual)} se mantiene.`,
      )
      return
    }

    setLimiteEsManual(false)
    setLimiteManualActual(null)
    showSuccess('Tu nueva estrategia financiera se actualizó correctamente.')
  }

  async function handleAplicarLimiteCalculado() {
    if (!user || !estrategiaPreview) return

    if (!isOnline()) {
      showError('Sin conexión. Conéctate a internet para actualizar el límite.')
      return
    }

    setAplicandoLimite(true)
    const { error, limite } = await applyLimiteCalculado(user.id)
    setAplicandoLimite(false)

    if (error) {
      showError(error)
      return
    }

    setLimiteEsManual(false)
    setLimiteManualActual(null)
    refresh()
    showSuccess(`Límite de gasto actualizado a ${formatCurrency(limite ?? estrategiaPreview.disponibleParaGasto)}.`)
  }

  if (cargando) {
    return (
      <div className="space-y-4">
        <p className="text-center text-sm text-slate-400">Cargando configuración...</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-slate-300">Tu situación financiera</h3>
        <p className="text-xs text-slate-500">
          Actualiza sueldo, extras o ahorro y el presupuesto diario se ajusta al instante
        </p>
      </div>

      <form onSubmit={handleSubmit} className={`space-y-5 ${formWithKeyboardClassName}`}>
        <div className="space-y-2">
          <label htmlFor="cfg-sueldo" className="block text-sm font-medium text-slate-300">
            Sueldo mensual
          </label>
          <input
            id="cfg-sueldo"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={sueldoMensual}
            onChange={(e) => setSueldoMensual(e.target.value)}
            className={inputClassName}
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="cfg-extras" className="block text-sm font-medium text-slate-300">
            Ingresos extras mensuales
            <span className="ml-1 font-normal text-slate-500">(opcional)</span>
          </label>
          <input
            id="cfg-extras"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="Bonos, ventas, intereses..."
            value={ingresosExtras}
            onChange={(e) => setIngresosExtras(e.target.value)}
            className={inputClassName}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="cfg-ahorro" className="text-sm font-medium text-slate-300">
              Porcentaje de ahorro
            </label>
            <span className="text-lg font-bold text-emerald-400">{porcentajeAhorro}%</span>
          </div>
          <input
            id="cfg-ahorro"
            type="range"
            min={5}
            max={50}
            step={5}
            value={porcentajeAhorro}
            onChange={(e) => setPorcentajeAhorro(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-emerald-500"
            aria-label="Porcentaje de ahorro"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>5%</span>
            <span>50%</span>
          </div>
          {ahorroSemanalPreview != null && ahorroSemanalPreview > 0 && (
            <p className="text-xs text-slate-400">
              ≈ {formatCurrency(ahorroSemanalPreview)} de ahorro por semana
            </p>
          )}
          {diferenciaAhorroMensual != null && diferenciaAhorroMensual !== 0 && hayCambios && (
            <p
              className={`rounded-lg px-3 py-2 text-xs ${
                diferenciaAhorroMensual > 0
                  ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border border-amber-500/30 bg-amber-500/10 text-amber-300'
              }`}
            >
              {diferenciaAhorroMensual > 0
                ? `Con este cambio, ahora ahorrarás ${formatCurrency(diferenciaAhorroMensual)} más al mes`
                : `Con este cambio, ahorrarás ${formatCurrency(Math.abs(diferenciaAhorroMensual))} menos al mes`}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="cfg-dia-pago" className="block text-sm font-medium text-slate-300">
            Día de pago semanal
          </label>
          <select
            id="cfg-dia-pago"
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

        {estrategiaPreview && (
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-blue-500/25 bg-blue-500/10 px-3 py-2.5 text-center">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                {limiteEsManual ? 'Límite calculado' : 'Disponible para gasto'}
              </p>
              <p className="mt-0.5 text-lg font-bold text-blue-300">
                {formatCurrency(estrategiaPreview.disponibleParaGasto)}
              </p>
            </div>
            {presupuestoDiarioPreview != null && (
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  Presupuesto diario estimado
                </p>
                <p className="mt-0.5 text-lg font-bold text-emerald-300">
                  {formatCurrency(presupuestoDiarioPreview)}
                </p>
              </div>
            )}
          </div>
        )}

        {limiteEsManual && limiteManualActual != null && estrategiaPreview && (
          <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <p className="text-sm text-amber-100">
              Tienes un límite manual de{' '}
              <span className="font-semibold">{formatCurrency(limiteManualActual)}</span> en el
              resumen. Guardar la estrategia no lo cambia; el calculado sería{' '}
              {formatCurrency(estrategiaPreview.disponibleParaGasto)}.
            </p>
            <button
              type="button"
              onClick={handleAplicarLimiteCalculado}
              disabled={aplicandoLimite}
              className={`w-full ${buttonSecondaryClassName}`}
            >
              {aplicandoLimite
                ? 'Aplicando...'
                : `Usar límite calculado (${formatCurrency(estrategiaPreview.disponibleParaGasto)})`}
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={guardando || !hayCambios}
          className={buttonPrimaryClassName}
        >
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  )
}
