import { useCallback, useMemo, useState } from 'react'
import { RECURRENTE_QUERY_SCOPES } from '../../lib/invalidateAppQueries'
import { useAuthSession, useGastosRefreshState } from '../../contexts'
import { getDefaultCuentaId, listCuentas } from '../../services/cuentas'
import { createGastoRecurrente } from '../../services/gastos/gastosRecurrentes'
import {
  dismissRecurrenteSugerido,
  type RecurrenteSugerido,
} from '../../utils/dashboard/detectarRecurrentes'
import { isModoViaje, setModoViaje } from '../../utils/dashboard/travelMode'
import { showError, showSuccess } from '../../utils/core/toast'

interface DashboardMutationsInput {
  recurrenteSugerido: RecurrenteSugerido | null
  setRecurrenteSugerido: (value: RecurrenteSugerido | null) => void
}

export function useDashboardMutations({
  recurrenteSugerido,
  setRecurrenteSugerido,
}: DashboardMutationsInput) {
  const { user } = useAuthSession()
  const { refresh } = useGastosRefreshState()

  const [marcandoRecurrente, setMarcandoRecurrente] = useState(false)
  const [modoViaje, setModoViajeState] = useState(() => isModoViaje())

  const handleToggleModoViaje = useCallback(() => {
    setModoViajeState((prev) => {
      const activo = !prev
      setModoViaje(activo)
      return activo
    })
  }, [])

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
    refresh(RECURRENTE_QUERY_SCOPES)
  }, [recurrenteSugerido, user, refresh, setRecurrenteSugerido])

  const handleDescartarRecurrente = useCallback(() => {
    if (!recurrenteSugerido) return
    dismissRecurrenteSugerido(recurrenteSugerido.descripcion)
    setRecurrenteSugerido(null)
  }, [recurrenteSugerido, setRecurrenteSugerido])

  return useMemo(
    () => ({
      marcandoRecurrente,
      modoViaje,
      handleToggleModoViaje,
      handleMarcarRecurrente,
      handleDescartarRecurrente,
    }),
    [
      marcandoRecurrente,
      modoViaje,
      handleToggleModoViaje,
      handleMarcarRecurrente,
      handleDescartarRecurrente,
    ],
  )
}
