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
import { useAuthSession } from './AuthContext'

interface QuietModeContextValue {
  modoTranquilo: boolean
  autoModoTranquilo: boolean
  setModoTranquiloActivo: (activo: boolean) => void
  toggleModoTranquilo: () => void
  reportDisponible: (disponible: number | null) => void
}

const QuietModeContext = createContext<QuietModeContextValue | null>(null)

export function QuietModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthSession()
  const [modoTranquilo, setModoTranquiloState] = useState(() => isModoTranquilo())
  const [autoModoTranquilo, setAutoModoTranquilo] = useState(false)
  const [disponible, setDisponible] = useState<number | null>(null)
  const [diaPago, setDiaPago] = useState<number | null>(null)
  const preferenciaManual = useRef(isModoTranquilo())
  const autoSuprimidoPorUsuario = useRef(false)
  const prevDebeAutoActivar = useRef(false)

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
    if (debeAutoActivar && !prevDebeAutoActivar.current) {
      autoSuprimidoPorUsuario.current = false
    }
    prevDebeAutoActivar.current = debeAutoActivar

    if (debeAutoActivar && !autoSuprimidoPorUsuario.current) {
      setModoTranquiloState(true)
      setAutoModoTranquilo(true)
      setModoTranquilo(true)
      return
    }

    if (autoModoTranquilo && !debeAutoActivar) {
      setModoTranquiloState(preferenciaManual.current)
      setAutoModoTranquilo(false)
    }
  }, [debeAutoActivar, autoModoTranquilo])

  const reportDisponible = useCallback((valor: number | null) => {
    setDisponible(valor)
  }, [])

  const setModoTranquiloActivo = useCallback((activo: boolean) => {
    preferenciaManual.current = activo
    if (!activo && debeAutoActivar) {
      autoSuprimidoPorUsuario.current = true
    } else if (activo) {
      autoSuprimidoPorUsuario.current = false
    }
    setAutoModoTranquilo(false)
    setModoTranquiloState(activo)
    setModoTranquilo(activo)
  }, [debeAutoActivar])

  const toggleModoTranquilo = useCallback(() => {
    setModoTranquiloState((current) => {
      const next = !current
      preferenciaManual.current = next
      if (!next && debeAutoActivar) {
        autoSuprimidoPorUsuario.current = true
      } else if (next) {
        autoSuprimidoPorUsuario.current = false
      }
      setAutoModoTranquilo(false)
      setModoTranquilo(next)
      return next
    })
  }, [debeAutoActivar])

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
