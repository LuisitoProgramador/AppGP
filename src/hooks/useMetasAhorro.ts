import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { useAuthContext, useGastosData } from '../contexts'
import {
  addAhorroToMeta,
  createMetaAhorro,
  listMetasAhorro,
} from '../services/metasAhorro'
import type { MetaAhorro } from '../types/metaAhorro'
import { formatCurrency } from '../utils/formatCurrency'
import { parseMontoValue } from '../utils/montoInput'
import { showError, showSuccess, showWarning } from '../utils/toast'
import { validateMonto, validateNombre } from '../utils/validation'

export function useMetasAhorro(enabled = true) {
  const { user } = useAuthContext()
  const { refreshKey } = useGastosData()

  const [metas, setMetas] = useState<MetaAhorro[]>([])
  const [metasCargando, setMetasCargando] = useState(true)
  const [metasError, setMetasError] = useState<string | null>(null)
  const [metasFromCache, setMetasFromCache] = useState(false)
  const [mostrarFormMeta, setMostrarFormMeta] = useState(false)
  const [metaNombre, setMetaNombre] = useState('')
  const [metaObjetivo, setMetaObjetivo] = useState('')
  const [guardandoMeta, setGuardandoMeta] = useState(false)
  const [ahorroInputs, setAhorroInputs] = useState<Record<number, string>>({})
  const [sumandoMetaId, setSumandoMetaId] = useState<number | null>(null)

  const cargarMetas = useCallback(async () => {
    if (!user) return

    setMetasCargando(true)
    setMetasError(null)

    const { data, error: listError, fromCache } = await listMetasAhorro(user.id)
    setMetasCargando(false)
    setMetasFromCache(fromCache)

    if (listError) {
      setMetasError(listError)
      return
    }

    setMetas(data)
  }, [user])

  useEffect(() => {
    if (!enabled) {
      setMetasCargando(false)
      return
    }
    cargarMetas()
  }, [cargarMetas, refreshKey, enabled])

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
        setMetas((current) => [...current, data])
      }

      setMetaNombre('')
      setMetaObjetivo('')
      setMostrarFormMeta(false)
      showSuccess('Meta de ahorro creada.')
    },
    [user, metaNombre, metaObjetivo],
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
      setMetas((current) =>
        current.map((item) =>
          item.id === meta.id
            ? { ...item, monto_actual: item.monto_actual + amount }
            : item,
        ),
      )

      const { data, error: addError, offline } = await addAhorroToMeta(
        user.id,
        meta.id,
        amount,
        meta.monto_actual,
      )

      setSumandoMetaId(null)

      if (addError) {
        setMetas(previousMetas)
        showError(addError)
        return
      }

      if (data) {
        setMetas((current) =>
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
    [user, ahorroInputs, metas],
  )

  return {
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
  }
}
