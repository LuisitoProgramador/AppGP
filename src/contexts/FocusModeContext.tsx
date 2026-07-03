import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

interface FocusModeContextValue {
  isFocusMode: boolean
  setIsFocusMode: (activo: boolean) => void
  toggleFocusMode: () => void
}

const FocusModeContext = createContext<FocusModeContextValue | null>(null)

export function FocusModeProvider({ children }: { children: ReactNode }) {
  const [isFocusMode, setIsFocusMode] = useState(false)

  const toggleFocusMode = useCallback(() => {
    setIsFocusMode((current) => !current)
  }, [])

  const value = useMemo(
    () => ({ isFocusMode, setIsFocusMode, toggleFocusMode }),
    [isFocusMode, toggleFocusMode],
  )

  return <FocusModeContext.Provider value={value}>{children}</FocusModeContext.Provider>
}

export function useFocusMode(): FocusModeContextValue {
  const ctx = useContext(FocusModeContext)
  if (!ctx) {
    throw new Error('useFocusMode debe usarse dentro de FocusModeProvider')
  }
  return ctx
}
