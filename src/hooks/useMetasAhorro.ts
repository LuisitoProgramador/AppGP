import { type FormEvent, useCallback, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthSession, useGastosRefreshState } from '../contexts'
import {
  addAhorroToMeta,
  createMetaAhorro,
  deleteMetaAhorro,
  listMetasAhorro,
  updateMetaAhorro,
} from '../services/metasAhorro'
import { queryKeys } from '../lib/queryKeys'
import { esMetaAhorroAnual } from '../utils/finanzas/metaCalendario'
import type { MetaAhorro } from '../types/metaAhorro'
import { formatCurrency } from '../utils/format/formatCurrency'
import { parseMontoValue } from '../utils/format/montoInput'
import { showError, showSuccess, showWarning } from '../utils/core/toast'
import { validateMonto, validateNombre } from '../utils/core/validation'

export function useMetasAhorro(enabled = true) {
  const { user } = useAuthSession()
  const { refreshKey } = useGastosRefreshState()
  const queryClient = useQueryClient()

  const metasQuery = useQuery({
    queryKey: [...queryKeys.metas(user?.id), refreshKey],
    queryFn: async () => {
      const { data, error: listError, fromCache } = await listMetasAhorro(user!.id)
      if (listError) throw new Error(listError)
      return { data, fromCache }
    },
    enabled: Boolean(user) && enabled,
  })

  const metas = metasQuery.data?.data ?? []
  const metasCargando = enabled && metasQuery.isLoading
  const metasError = metasQuery.error ? (metasQuery.error as Error).message : null
  const metasFromCache = metasQuery.data?.fromCache ?? false


  const setMetasOptimistic = useCallback(
    (updater: (current: MetaAhorro[]) => MetaAhorro[]) => {
      if (!user) return
      queryClient.setQueryData<{ data: MetaAhorro[]; fromCache: boolean }>(
        [...queryKeys.metas(user.id), refreshKey],
        (current) => ({
          data: updater(current?.data ?? []),
          fromCache: current?.fromCache ?? false,
        }),
      )
    },
    [queryClient, refreshKey, user],
  )

  const [mostrarFormMeta, setMostrarFormMeta] = useState(false)
  const [metaNombre, setMetaNombre] = useState('')
  const [metaObjetivo, setMetaObjetivo] = useState('')
  const [guardandoMeta, setGuardandoMeta] = useState(false)
  const [ahorroInputs, setAhorroInputs] = useState<Record<number, string>>({})
  const [sumandoMetaId, setSumandoMetaId] = useState<number | null>(null)
  const [editandoMetaId, setEditandoMetaId] = useState<number | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editObjetivo, setEditObjetivo] = useState('')
  const [guardandoEdicionMeta, setGuardandoEdicionMeta] = useState(false)
  const [eliminandoMetaId, setEliminandoMetaId] = useState<number | null>(null)

  const handleCrearMeta = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!user) return

      const objetivoError = validateMonto(metaObjetivo)
      if (objetivoError) {
        showError(objetivoError)
        return
      }

      const nombreError = validateNombre(metaNombre, 'El nombre de la meta')
      if (nombreError) {
        showError(nombreError)
        return
      }

      const nombre = metaNombre.trim()

      setGuardandoMeta(true)
      const { data, error: createError } = await createMetaAhorro(user.id, {
        nombre,
        monto_objetivo: parseMontoValue(metaObjetivo),
      })
      setGuardandoMeta(false)

      if (createError) {
        showError(createError)
        return
      }

      if (data) {
        setMetasOptimistic((current) => [...current, data])
      }

      setMetaNombre('')
      setMetaObjetivo('')
      setMostrarFormMeta(false)
      showSuccess('Meta de ahorro creada.')
    },
    [user, metaNombre, metaObjetivo, setMetasOptimistic],
  )

  const iniciarEdicionMeta = useCallback((meta: MetaAhorro) => {
    setEditandoMetaId(meta.id)
    setEditNombre(meta.nombre)
    setEditObjetivo(String(meta.monto_objetivo))
  }, [])

  const cancelarEdicionMeta = useCallback(() => {
    setEditandoMetaId(null)
    setEditNombre('')
    setEditObjetivo('')
  }, [])

  const handleGuardarEdicionMeta = useCallback(
    async (meta: MetaAhorro) => {
      if (!user) return

      const objetivoError = validateMonto(editObjetivo)
      if (objetivoError) {
        showError(objetivoError)
        return
      }

      const nombreError = validateNombre(editNombre, 'El nombre de la meta')
      if (nombreError) {
        showError(nombreError)
        return
      }

      setGuardandoEdicionMeta(true)
      const { data, error: updateError } = await updateMetaAhorro(user.id, meta.id, {
        nombre: editNombre.trim(),
        monto_objetivo: parseMontoValue(editObjetivo),
      })
      setGuardandoEdicionMeta(false)

      if (updateError) {
        showError(updateError)
        return
      }

      if (data) {
        setMetasOptimistic((current) => current.map((item) => (item.id === meta.id ? data : item)))
      }

      cancelarEdicionMeta()
      showSuccess('Meta actualizada.')
    },
    [user, editNombre, editObjetivo, cancelarEdicionMeta, setMetasOptimistic],
  )

  const handleEliminarMeta = useCallback(
    async (meta: MetaAhorro) => {
      if (!user) return
      if (esMetaAhorroAnual(meta)) return

      if (!confirm(`¿Eliminar la meta "${meta.nombre}"?`)) return

      setEliminandoMetaId(meta.id)
      const { error: deleteError } = await deleteMetaAhorro(user.id, meta.id)
      setEliminandoMetaId(null)

      if (deleteError) {
        showError(deleteError)
        return
      }

      setMetasOptimistic((current) => current.filter((item) => item.id !== meta.id))
      if (editandoMetaId === meta.id) cancelarEdicionMeta()
      showSuccess('Meta eliminada.')
    },
    [user, editandoMetaId, cancelarEdicionMeta, setMetasOptimistic],
  )

  const handleSumarAhorro = useCallback(
    async (meta: MetaAhorro) => {
      if (!user) return

      const inputValue = ahorroInputs[meta.id] ?? ''
      const montoError = validateMonto(inputValue)
      if (montoError) {
        showError(montoError)
        return
      }

      const amount = parseMontoValue(inputValue)
      setSumandoMetaId(meta.id)

      const previousMetas = metas
      setMetasOptimistic((current) =>
        current.map((item) =>
          item.id === meta.id
            ? { ...item, monto_actual: item.monto_actual + amount }
            : item,
        ),
      )

      const { data, error: addError, offline } = await addAhorroToMeta(user.id, meta.id, amount)

      setSumandoMetaId(null)

      if (addError) {
        setMetasOptimistic(() => previousMetas)
        showError(addError)
        return
      }

      if (data) {
        setMetasOptimistic((current) =>
          current.map((item) => (item.id === meta.id ? data : item)),
        )
      }

      setAhorroInputs((current) => ({ ...current, [meta.id]: '' }))

      if (offline) {
        showWarning(
          'Sin conexión. El ahorro se guardó localmente y se sincronizará al volver internet.',
        )
        return
      }

      showSuccess(`Se sumaron ${formatCurrency(amount)} a "${meta.nombre}".`)
    },
    [user, ahorroInputs, metas, setMetasOptimistic],
  )

  return useMemo(
    () => ({
      metas,
      metasCargando,
      metasError,
      metasFromCache,
      mostrarFormMeta,
      setMostrarFormMeta,
      metaNombre,
      setMetaNombre,
      metaObjetivo,
      setMetaObjetivo,
      guardandoMeta,
      ahorroInputs,
      setAhorroInputs,
      sumandoMetaId,
      handleCrearMeta,
      handleSumarAhorro,
      editandoMetaId,
      editNombre,
      setEditNombre,
      editObjetivo,
      setEditObjetivo,
      guardandoEdicionMeta,
      eliminandoMetaId,
      iniciarEdicionMeta,
      cancelarEdicionMeta,
      handleGuardarEdicionMeta,
      handleEliminarMeta,
      esMetaAhorroAnual,
    }),
    [
      metas,
      metasCargando,
      metasError,
      metasFromCache,
      mostrarFormMeta,
      metaNombre,
      metaObjetivo,
      guardandoMeta,
      ahorroInputs,
      sumandoMetaId,
      handleCrearMeta,
      handleSumarAhorro,
      editandoMetaId,
      editNombre,
      editObjetivo,
      guardandoEdicionMeta,
      eliminandoMetaId,
      iniciarEdicionMeta,
      cancelarEdicionMeta,
      handleGuardarEdicionMeta,
      handleEliminarMeta,
    ],
  )
}
