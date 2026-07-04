import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useAuthSession, useGastosRefreshState } from '../../contexts'
import { getPresupuesto, savePresupuestoFinanciero, applyLimiteCalculado } from '../../services/presupuesto'
import {
  PORCENTAJE_AHORRO_DEFAULT,
  PORCENTAJE_AHORRO_MAX,
  PORCENTAJE_AHORRO_MIN,
  PORCENTAJE_AHORRO_STEP,
  validatePorcentajeAhorro,
} from '../../constants/porcentajeAhorro'
import { getDaysRemainingInMonth } from '../../utils/date'
import {
  calcDiferenciaAhorroMensual,
  calcEstrategiaFinanciera,
  calcPrimerAhorro,
} from '../../utils/finanzas'
import { CATEGORIAS_DEFAULT } from '../../types/gasto'
import { formatCurrency } from '../../utils/format/formatCurrency'
import { formatMontoFromNumber, parseMontoValue } from '../../utils/format/montoInput'
import {
  calcAhorroMensual503020,
  calcLimitesRegla503020,
  calcTotalBucket503020,
} from '../../utils/finanzas/regla503020'
import { isOnline } from '../../utils/core/network'
import { showError, showSuccess } from '../../utils/core/toast'
import { validateMonto } from '../../utils/core/validation'

function validateIngresosExtrasOpcional(value: string): string | null {
  if (!value.trim()) return null
  const monto = parseMontoValue(value)
  if (Number.isNaN(monto) || monto < 0) {
    return 'Los ingresos extras deben ser un número válido mayor o igual a 0.'
  }
  return null
}

export function usePresupuestoSettings() {
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

  return {
    cargando,
    guardando,
    aplicandoLimite,
    limiteEsManual,
    limiteManualActual,
    sueldoMensual,
    setSueldoMensual,
    ingresosExtras,
    setIngresosExtras,
    porcentajeAhorro,
    setPorcentajeAhorro,
    diaPago,
    setDiaPago,
    estrategiaPreview,
    ahorroSemanalPreview,
    diferenciaAhorroMensual,
    presupuestoDiarioPreview,
    ingresoMensualPreview,
    regla503020Preview,
    hayCambios,
    handleSubmit,
    handleAplicarLimiteCalculado,
    porcentajeAhorroMin: PORCENTAJE_AHORRO_MIN,
    porcentajeAhorroMax: PORCENTAJE_AHORRO_MAX,
    porcentajeAhorroStep: PORCENTAJE_AHORRO_STEP,
  }
}
