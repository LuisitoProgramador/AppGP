import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { getPresupuesto } from '../services/presupuesto'
import { shouldAutoActivarModoTranquilo } from '../utils/quietModeAuto'
import { isModoTranquilo, setModoTranquilo } from '../utils/quietMode'
import { useAuthContext } from './AuthContext'

interface QuietModeContextValue {
  modoTranquilo: boolean
  autoModoTranquilo: boolean
  setModoTranquiloActivo: (activo: boolean) => void
  toggleModoTranquilo: () => void
  reportDisponible: (disponible: number | null) => void
}

const QuietModeContext = createContext<QuietModeContextValue | null>(null)

export function QuietModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext()
  const [modoTranquilo, setModoTranquiloState] = useState(() => isModoTranquilo())
  const [autoModoTranquilo, setAutoModoTranquilo] = useState(false)
  const [disponible, setDisponible] = useState<number | null>(null)
  const [diaPago, setDiaPago] = useState<number | null>(null)
  const preferenciaManual = useRef(isModoTranquilo())

  const debeAutoActivar = useMemo(
    () => shouldAutoActivarModoTranquilo({ disponible, diaPago }),
    [disponible, diaPago],
  )

  useEffect(() => {
    if (!user) return

    let cancelled = false

    getPresupuesto(user.id).then((presupuesto) => {
      if (!cancelled) {
        setDiaPago(presupuesto?.dia_pago ?? null)
      }
    })

    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    if (debeAutoActivar) {
      setModoTranquiloState(true)
      setAutoModoTranquilo(true)
      return
    }

    if (autoModoTranquilo) {
      setModoTranquiloState(preferenciaManual.current)
      setAutoModoTranquilo(false)
    }
  }, [debeAutoActivar, autoModoTranquilo])

  const reportDisponible = useCallback((valor: number | null) => {
    setDisponible(valor)
  }, [])

  const setModoTranquiloActivo = useCallback((activo: boolean) => {
    preferenciaManual.current = activo
    setAutoModoTranquilo(false)
    setModoTranquiloState(activo)
    setModoTranquilo(activo)
  }, [])

  const toggleModoTranquilo = useCallback(() => {
    setModoTranquiloActivo(!modoTranquilo)
  }, [modoTranquilo, setModoTranquiloActivo])

  const value = useMemo(
    () => ({
      modoTranquilo,
      autoModoTranquilo,
      setModoTranquiloActivo,
      toggleModoTranquilo,
      reportDisponible,
    }),
    [modoTranquilo, autoModoTranquilo, setModoTranquiloActivo, toggleModoTranquilo, reportDisponible],
  )

  return <QuietModeContext.Provider value={value}>{children}</QuietModeContext.Provider>
}

export function useQuietMode(): QuietModeContextValue {
  const ctx = useContext(QuietModeContext)
  if (!ctx) {
    throw new Error('useQuietMode debe usarse dentro de QuietModeProvider')
  }
  return ctx
}
