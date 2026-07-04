import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useAuthSession, useGastosRefreshState } from '../contexts'
import { getPresupuesto, savePresupuestoFinanciero, applyLimiteCalculado } from '../services/presupuesto'
import { DIAS_PAGO_SELECT_OPTIONS } from '../constants/formOptions'
import {
  PORCENTAJE_AHORRO_DEFAULT,
  PORCENTAJE_AHORRO_MAX,
  PORCENTAJE_AHORRO_MIN,
  PORCENTAJE_AHORRO_STEP,
  validatePorcentajeAhorro,
} from '../constants/porcentajeAhorro'
import { getDaysRemainingInMonth } from '../utils/date'
import {
  calcDiferenciaAhorroMensual,
  calcEstrategiaFinanciera,
  calcPrimerAhorro,
} from '../utils/finanzas'
import { REGLA_503020 } from '../constants/regla503020'
import { CATEGORIAS_DEFAULT } from '../types/gasto'
import { formatCurrency } from '../utils/formatCurrency'
import { formatMontoFromNumber, parseMontoValue } from '../utils/montoInput'
import {
  calcAhorroMensual503020,
  calcLimitesRegla503020,
  calcTotalBucket503020,
} from '../utils/regla503020'
import { isOnline } from '../utils/network'
import { showError, showSuccess } from '../utils/toast'
import { validateMonto } from '../utils/validation'
import {
  buttonPrimaryClassName,
  buttonSecondaryClassName,
  formWithKeyboardClassName,
} from './formStyles'
import Select from './Select'
import MontoInput from './MontoInput'

function validateIngresosExtrasOpcional(value: string): string | null {
  if (!value.trim()) return null
  const monto = parseMontoValue(value)
  if (Number.isNaN(monto) || monto < 0) {
    return 'Los ingresos extras deben ser un número válido mayor o igual a 0.'
  }
  return null
}

export default function PresupuestoSettings() {
  const { user } = useAuthSession()
  const { refreshKey, refresh } = useGastosRefreshState()

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [aplicandoLimite, setAplicandoLimite] = useState(false)

  const [limiteEsManual, setLimiteEsManual] = useState(false)
  const [limiteManualActual, setLimiteManualActual] = useState<number | null>(null)

  const [sueldoMensual, setSueldoMensual] = useState('')
  const [ingresosExtras, setIngresosExtras] = useState('')
  const [porcentajeAhorro, setPorcentajeAhorro] = useState(PORCENTAJE_AHORRO_DEFAULT)
  const [diaPago, setDiaPago] = useState(5)
  const [diaPagoInicial, setDiaPagoInicial] = useState(5)

  const [valoresIniciales, setValoresIniciales] = useState({
    sueldoMensual: 0,
    ingresosExtras: 0,
    porcentajeAhorro: PORCENTAJE_AHORRO_DEFAULT,
  })

  useEffect(() => {
    if (!user) return

    const userId = user.id
    let cancelled = false

    async function cargar() {
      setCargando(true)
      const presupuesto = await getPresupuesto(userId)
      if (cancelled) return

      if (presupuesto) {
        setLimiteEsManual(presupuesto.limite_es_manual)
        setLimiteManualActual(
          presupuesto.limite_es_manual ? presupuesto.limite_mensual : null,
        )

        if (presupuesto.sueldo_mensual != null) {
          const sueldo = presupuesto.sueldo_mensual
          const extras = presupuesto.ingresos_extras ?? 0
          const ahorro = presupuesto.porcentaje_ahorro ?? PORCENTAJE_AHORRO_DEFAULT

          setSueldoMensual(formatMontoFromNumber(sueldo))
          setIngresosExtras(extras > 0 ? formatMontoFromNumber(extras) : '')
          setPorcentajeAhorro(ahorro)
          setDiaPago(presupuesto.dia_pago ?? 5)
          setDiaPagoInicial(presupuesto.dia_pago ?? 5)
          setValoresIniciales({
            sueldoMensual: sueldo,
            ingresosExtras: extras,
            porcentajeAhorro: ahorro,
          })
        }
      }

      setCargando(false)
    }

    cargar()

    return () => {
      cancelled = true
    }
  }, [user, refreshKey])

  const sueldoNum = parseMontoValue(sueldoMensual) || 0
  const extrasNum = ingresosExtras.trim() ? parseMontoValue(ingresosExtras) || 0 : 0

  const estrategiaPreview = useMemo(() => {
    if (sueldoNum <= 0) return null
    return calcEstrategiaFinanciera({
      sueldoMensual: sueldoNum,
      ingresosExtras: extrasNum,
      porcentajeAhorro,
    })
  }, [sueldoNum, extrasNum, porcentajeAhorro])

  const ahorroSemanalPreview =
    sueldoNum > 0 ? calcPrimerAhorro(sueldoNum, porcentajeAhorro, extrasNum) : null

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

  const ingresoMensualPreview = sueldoNum + extrasNum

  const regla503020Preview = useMemo(() => {
    if (ingresoMensualPreview <= 0) return null
    return {
      necesidades: calcTotalBucket503020(ingresoMensualPreview, 'necesidades'),
      caprichos: calcTotalBucket503020(ingresoMensualPreview, 'caprichos'),
      ahorro: calcAhorroMensual503020(ingresoMensualPreview),
      limites: calcLimitesRegla503020(ingresoMensualPreview, CATEGORIAS_DEFAULT),
    }
  }, [ingresoMensualPreview])

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

    const ahorroError = validatePorcentajeAhorro(porcentajeAhorro)
    if (ahorroError) {
      showError(ahorroError)
      return
    }

    if (!isOnline()) {
      showError('Sin conexión. Conéctate a internet para actualizar tu estrategia financiera.')
      return
    }

    setGuardando(true)

    const { error, limiteManualPreservado, presupuesto: presupuestoGuardado } =
      await savePresupuestoFinanciero(user.id, {
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
    if (limiteManualPreservado) {
      const limite =
        presupuestoGuardado?.limite_mensual ?? limiteManualActual ?? null
      setLimiteEsManual(true)
      if (limite != null) setLimiteManualActual(limite)
      if (limite != null) {
        showSuccess(
          `Estrategia actualizada. Tu límite manual de ${formatCurrency(limite)} se mantiene.`,
        )
        return
      }
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
          Tu sueldo define la regla 50/30/20: límites por categoría, necesidades, caprichos y
          ahorro del 20%
        </p>
      </div>

      <form onSubmit={handleSubmit} className={`space-y-5 ${formWithKeyboardClassName}`}>
        <div className="space-y-2">
          <label htmlFor="cfg-sueldo" className="block text-sm font-medium text-slate-300">
            Sueldo mensual
          </label>
          <MontoInput
            id="cfg-sueldo"
            value={sueldoMensual}
            onChange={setSueldoMensual}
            placeholder="0"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="cfg-extras" className="block text-sm font-medium text-slate-300">
            Ingresos extras mensuales
            <span className="ml-1 font-normal text-slate-500">(opcional)</span>
          </label>
          <MontoInput
            id="cfg-extras"
            value={ingresosExtras}
            onChange={setIngresosExtras}
            placeholder="Bonos, ventas, intereses..."
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="cfg-ahorro" className="text-sm font-medium text-slate-300">
              Porcentaje de ahorro
            </label>
            <span className="text-lg font-bold text-pulso-accent-muted">{porcentajeAhorro}%</span>
          </div>
          <input
            id="cfg-ahorro"
            type="range"
            min={PORCENTAJE_AHORRO_MIN}
            max={PORCENTAJE_AHORRO_MAX}
            step={PORCENTAJE_AHORRO_STEP}
            value={porcentajeAhorro}
            onChange={(e) => setPorcentajeAhorro(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-pulso-accent"
            aria-label="Porcentaje de ahorro"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>{PORCENTAJE_AHORRO_MIN}%</span>
            <span>{PORCENTAJE_AHORRO_MAX}%</span>
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
                  ? 'border border-pulso-accent/30 bg-pulso-accent/10 text-pulso-accent-muted'
                  : 'border border-pulso-warning/30 bg-pulso-warning/10 text-pulso-warning'
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
          <Select
            id="cfg-dia-pago"
            value={String(diaPago)}
            onChange={(value) => setDiaPago(Number(value))}
            aria-label="Día de pago semanal"
            options={DIAS_PAGO_SELECT_OPTIONS}
          />
          <p className="text-xs text-slate-500">
            El día de la semana en que recibes tu sueldo semanal
          </p>
        </div>

        {regla503020Preview && (
          <div className="space-y-3 rounded-xl border border-slate-700/60 bg-slate-900/40 px-4 py-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">Regla 50 / 30 / 20</p>
              <p className="text-xs text-slate-500">
                Sobre {formatCurrency(ingresoMensualPreview)} de ingreso mensual
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-slate-700/50 bg-slate-800/40 px-2 py-2">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Necesidades</p>
                <p className="mt-0.5 text-sm font-bold text-white">
                  {formatCurrency(regla503020Preview.necesidades)}
                </p>
                <p className="text-[10px] text-slate-500">
                  {Math.round(REGLA_503020.necesidades * 100)}%
                </p>
              </div>
              <div className="rounded-lg border border-slate-700/50 bg-slate-800/40 px-2 py-2">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Caprichos</p>
                <p className="mt-0.5 text-sm font-bold text-white">
                  {formatCurrency(regla503020Preview.caprichos)}
                </p>
                <p className="text-[10px] text-slate-500">
                  {Math.round(REGLA_503020.caprichos * 100)}%
                </p>
              </div>
              <div className="rounded-lg border border-pulso-accent/25 bg-pulso-accent/10 px-2 py-2">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Ahorro</p>
                <p className="mt-0.5 text-sm font-bold text-pulso-accent-muted">
                  {formatCurrency(regla503020Preview.ahorro)}
                </p>
                <p className="text-[10px] text-slate-500">
                  {Math.round(REGLA_503020.ahorro * 100)}%
                </p>
              </div>
            </div>
            <ul className="space-y-1 text-xs text-slate-300">
              {CATEGORIAS_DEFAULT.map((categoria) => {
                const limite = regla503020Preview.limites[categoria]
                if (limite == null) return null
                return (
                  <li key={categoria} className="flex justify-between gap-2">
                    <span>{categoria}</span>
                    <span className="text-slate-400">{formatCurrency(limite)}</span>
                  </li>
                )
              })}
            </ul>
            <p className="text-[10px] leading-snug text-slate-500">
              Al guardar se actualizan los límites por categoría en el resumen y en Ajustes.
            </p>
          </div>
        )}

        {estrategiaPreview && (
          <div className={`grid gap-2 ${presupuestoDiarioPreview != null ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
            <div className="rounded-xl border border-pulso-accent/25 bg-pulso-accent/10 px-3 py-2.5 text-center">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                {limiteEsManual ? 'Límite calculado' : 'Disponible para gasto'}
              </p>
              <p className="mt-0.5 text-lg font-bold text-pulso-accent-muted">
                {formatCurrency(estrategiaPreview.disponibleParaGasto)}
              </p>
            </div>
            {presupuestoDiarioPreview != null && (
              <div className="rounded-xl border border-pulso-accent/25 bg-pulso-accent/10 px-3 py-2.5 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  Presupuesto diario estimado
                </p>
                <p className="mt-0.5 text-lg font-bold text-pulso-accent-muted">
                  {formatCurrency(presupuestoDiarioPreview)}
                </p>
                <p className="mt-1 text-[10px] leading-snug text-slate-500">
                  Referencia teórica (sin gastos del mes). El disponible real está en el inicio.
                </p>
              </div>
            )}
          </div>
        )}

        {limiteEsManual && limiteManualActual != null && estrategiaPreview && (
          <div className="space-y-3 rounded-xl border border-pulso-warning/30 bg-pulso-warning/10 px-4 py-3">
            <p className="text-sm text-pulso-warning/90">
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
              {aplicandoLimite ? (
                'Aplicando...'
              ) : (
                <>
                  <span className="block">Usar límite calculado</span>
                  <span className="mt-0.5 block text-sm font-bold text-white">
                    {formatCurrency(estrategiaPreview.disponibleParaGasto)}
                  </span>
                </>
              )}
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
