import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { useAuthContext, useGastosData } from '../contexts'
import { saveLimiteMensual } from '../services/presupuesto'
import { getDefaultCuentaId, listCuentas } from '../services/cuentas'
import { createGastoRecurrente } from '../services/gastosRecurrentes'
import {
  dismissRecurrenteSugerido,
  type RecurrenteSugerido,
} from '../utils/detectarRecurrentes'
import { isModoViaje, setModoViaje } from '../utils/travelMode'
import { isVistaQuincenal, setVistaQuincenal } from '../utils/vistaQuincenal'
import { showError, showSuccess } from '../utils/toast'
import { validateMonto } from '../utils/validation'

interface DashboardMutationsInput {
  limiteMensual: number
  setLimiteMensual: (limite: number) => void
  recurrenteSugerido: RecurrenteSugerido | null
  setRecurrenteSugerido: (value: RecurrenteSugerido | null) => void
}

export function useDashboardMutations({
  limiteMensual,
  setLimiteMensual,
  recurrenteSugerido,
  setRecurrenteSugerido,
}: DashboardMutationsInput) {
  const { user } = useAuthContext()
  const { refresh } = useGastosData()

  const [limiteInput, setLimiteInput] = useState(String(limiteMensual))
  const [guardandoLimite, setGuardandoLimite] = useState(false)
  const [marcandoRecurrente, setMarcandoRecurrente] = useState(false)
  const [modoViaje, setModoViajeState] = useState(() => isModoViaje())
  const [vistaQuincenal, setVistaQuincenalState] = useState(() => isVistaQuincenal())

  useEffect(() => {
    setLimiteInput(String(limiteMensual))
  }, [limiteMensual])

  const handleGuardarLimite = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!user) return

      const limiteError = validateMonto(limiteInput)
      if (limiteError) {
        showError(limiteError)
        return
      }

      const limite = Number(limiteInput)
      setGuardandoLimite(true)
      const { error: saveError } = await saveLimiteMensual(user.id, limite)
      setGuardandoLimite(false)

      if (saveError) {
        showError(`Error al guardar límite: ${saveError}`)
        return
      }

      setLimiteMensual(limite)
      showSuccess('Límite mensual guardado.')
    },
    [user, limiteInput, setLimiteMensual],
  )

  const handleToggleModoViaje = useCallback(() => {
    const activo = !modoViaje
    setModoViajeState(activo)
    setModoViaje(activo)
  }, [modoViaje])

  const handleToggleVistaQuincenal = useCallback(() => {
    const activo = !vistaQuincenal
    setVistaQuincenalState(activo)
    setVistaQuincenal(activo)
  }, [vistaQuincenal])

  const handleMarcarRecurrente = useCallback(async () => {
    if (!recurrenteSugerido || !user) return

    setMarcandoRecurrente(true)

    const { data: cuentasData } = await listCuentas(user.id)
    const cuentaId = getDefaultCuentaId(cuentasData)

    const { error: createError } = await createGastoRecurrente({
      descripcion: recurrenteSugerido.descripcion,
      monto: recurrenteSugerido.monto,
      categoria: recurrenteSugerido.categoria,
      dia_mes: recurrenteSugerido.dia_mes,
      cuenta_id: cuentaId,
    })
    setMarcandoRecurrente(false)

    if (createError) {
      showError(`No se pudo crear el recurrente: ${createError}`)
      return
    }

    dismissRecurrenteSugerido(recurrenteSugerido.descripcion)
    setRecurrenteSugerido(null)
    showSuccess('Gasto recurrente configurado.')
    refresh()
  }, [recurrenteSugerido, user, refresh, setRecurrenteSugerido])

  const handleDescartarRecurrente = useCallback(() => {
    if (!recurrenteSugerido) return
    dismissRecurrenteSugerido(recurrenteSugerido.descripcion)
    setRecurrenteSugerido(null)
  }, [recurrenteSugerido, setRecurrenteSugerido])

  return {
    limiteInput,
    setLimiteInput,
    guardandoLimite,
    marcandoRecurrente,
    modoViaje,
    vistaQuincenal,
    handleGuardarLimite,
    handleToggleModoViaje,
    handleToggleVistaQuincenal,
    handleMarcarRecurrente,
    handleDescartarRecurrente,
  }
}
