import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useAuthSession } from '../../contexts'
import {
  calcLimiteMensual,
  calcPrimerAhorro,
  completeOnboarding,
  guessCategoria,
  type OnboardingCuentaLiquida,
  type OnboardingTarjeta,
} from '../../services/onboarding'
import { PORCENTAJE_AHORRO_DEFAULT } from '../../constants/porcentajeAhorro'
import { CATEGORIAS_DEFAULT } from '../../types/gasto'
import { formatCurrency } from '../../utils/format/formatCurrency'
import { parseMontoValue } from '../../utils/format/montoInput'
import { isOnline } from '../../utils/core/network'
import {
  calcAhorroMensual503020,
  calcLimitesRegla503020,
  calcTotalBucket503020,
} from '../../utils/finanzas/regla503020'
import { showError, showSuccess } from '../../utils/core/toast'
import { validateDescripcion, validateMonto } from '../../utils/core/validation'
import type {
  CuentaLiquidaDraft,
  CuentaOption,
  GastoFijoDraft,
  TarjetaDraft,
} from './types'

export function useOnboardingFlow(onComplete: () => void) {
  const { user } = useAuthSession()
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

  const regla503020Preview = useMemo(() => {
    if (sueldoNum <= 0) return null
    return {
      necesidades: calcTotalBucket503020(sueldoNum, 'necesidades'),
      caprichos: calcTotalBucket503020(sueldoNum, 'caprichos'),
      ahorro: calcAhorroMensual503020(sueldoNum),
      limites: calcLimitesRegla503020(sueldoNum, CATEGORIAS_DEFAULT),
    }
  }, [sueldoNum])

  return {
    step,
    animating,
    guardando,
    sueldoMensual,
    setSueldoMensual,
    diaPago,
    setDiaPago,
    porcentajeAhorro,
    setPorcentajeAhorro,
    gastosFijos,
    gastoForm,
    setGastoForm,
    tarjetas,
    cuentasLiquidas,
    cuentaLiquidaForm,
    setCuentaLiquidaForm,
    showCuentaLiquidaForm,
    setShowCuentaLiquidaForm,
    tarjetaForm,
    setTarjetaForm,
    showTarjetaForm,
    setShowTarjetaForm,
    cuentaOptions,
    totalCuentas,
    cuentaLabelById,
    goToStep,
    handleStep1Next,
    handleStep2Next,
    handleStep3Next,
    handleAddGasto,
    addSugerencia,
    removeGasto,
    handleAddTarjeta,
    removeTarjeta,
    handleAddCuentaLiquida,
    removeCuentaLiquida,
    handleFinish,
    sueldoNum,
    limitePreview,
    ahorroPreview,
    regla503020Preview,
  }
}

export type OnboardingFlowState = ReturnType<typeof useOnboardingFlow>
