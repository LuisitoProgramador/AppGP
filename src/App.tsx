import { useEffect, useState, useCallback, type ReactNode } from 'react'
import { AuthProvider, GastosProviders, QuietModeProvider, FocusModeProvider, useAuthContext } from './contexts'
import {
  Ajustes,
  Dashboard,
  ErrorBoundary,
  GastoForm,
  Historial,
  Layout,
  LoginForm,
  Plan,
  OnboardingFlow,
} from './components'
import { navTabClassName, navBottomTabClassName, iconButtonClassName, tabPanelClassName } from './components/formStyles'
import { useTabSwipe } from './hooks/useTabSwipe'
import { checkNeedsOnboarding } from './services/onboarding'
import { readSessionStorage, writeSessionStorage } from './utils/storage'
import { showError } from './utils/toast'

type AppTab = 'registro' | 'resumen' | 'historial' | 'plan'

const TAB_STORAGE_KEY = 'app-tab'

const VALID_TABS: AppTab[] = ['registro', 'resumen', 'historial', 'plan']

const TABS: { id: AppTab; label: string; shortLabel: string }[] = [
  { id: 'registro', label: 'Registro', shortLabel: 'Nuevo' },
  { id: 'resumen', label: 'Resumen', shortLabel: 'Resumen' },
  { id: 'historial', label: 'Historial', shortLabel: 'Historial' },
  { id: 'plan', label: 'Plan', shortLabel: 'Plan' },
]

function getInitialTab(): AppTab {
  const params = new URLSearchParams(window.location.search)
  if (params.has('q')) {
    writeSessionStorage(TAB_STORAGE_KEY, 'registro')
    return 'registro'
  }

  const saved = readSessionStorage(TAB_STORAGE_KEY)
  if (saved === 'ajustes') {
    return 'resumen'
  }
  if (saved === 'recurrentes' || saved === 'metas') {
    return 'plan'
  }
  if (saved && VALID_TABS.includes(saved as AppTab)) {
    return saved as AppTab
  }
  return 'registro'
}

function SettingsIcon() {
  return (
    <svg
      className="h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.85 1 1.51 1H21a2 2 0 1 1 0 4h-.09c-.66 0-1.25.4-1.51 1Z" />
    </svg>
  )
}

function LogOutIcon() {
  return (
    <svg
      className="h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  )
}

type OnboardingState = 'loading' | 'needed' | 'done'

interface TabPanelProps {
  id: AppTab
  activeTab: AppTab
  children: ReactNode
}

function TabPanel({ id, activeTab, children }: TabPanelProps) {
  if (activeTab !== id) return null

  return (
    <div
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={`tab-${id}`}
      className={tabPanelClassName}
    >
      {children}
    </div>
  )
}

function AppContent() {
  const { user, loading, signOut } = useAuthContext()
  const [tab, setTab] = useState<AppTab>(getInitialTab)
  const [showAjustes, setShowAjustes] = useState(false)
  const [onboardingState, setOnboardingState] = useState<OnboardingState>('loading')

  function handleTabChange(nextTab: AppTab) {
    setShowAjustes(false)
    setTab(nextTab)
    writeSessionStorage(TAB_STORAGE_KEY, nextTab)
  }

  const tabIndex = TABS.findIndex(({ id }) => id === tab)

  const handleSwipeLeft = useCallback(() => {
    if (showAjustes || tabIndex >= TABS.length - 1) return
    handleTabChange(TABS[tabIndex + 1].id)
  }, [showAjustes, tabIndex])

  const handleSwipeRight = useCallback(() => {
    if (showAjustes || tabIndex <= 0) return
    handleTabChange(TABS[tabIndex - 1].id)
  }, [showAjustes, tabIndex])

  const swipeHandlers = useTabSwipe(handleSwipeLeft, handleSwipeRight)

  function handleToggleAjustes() {
    setShowAjustes((open) => !open)
  }

  useEffect(() => {
    if (!user) {
      setOnboardingState('loading')
      return
    }

    let cancelled = false

    checkNeedsOnboarding(user.id).then((needs) => {
      if (!cancelled) {
        setOnboardingState(needs ? 'needed' : 'done')
      }
    })

    return () => {
      cancelled = true
    }
  }, [user])

  if (loading) {
    return (
      <Layout>
        <p className="text-center text-slate-400">Cargando...</p>
      </Layout>
    )
  }

  if (!user) {
    return (
      <Layout>
        <section className="space-y-6">
          <h1 className="text-center text-3xl font-bold">Pulso</h1>
          <LoginForm />
        </section>
      </Layout>
    )
  }

  async function handleSignOut() {
    const { error } = await signOut()
    if (error) {
      showError(`Error al cerrar sesión: ${error.message}`)
    }
  }

  if (onboardingState === 'loading') {
    return (
      <Layout>
        <p className="text-center text-slate-400">Preparando tu espacio...</p>
      </Layout>
    )
  }

  if (onboardingState === 'needed') {
    return (
      <Layout>
        <OnboardingFlow
          onComplete={() => {
            setOnboardingState('done')
            handleTabChange('resumen')
          }}
        />
      </Layout>
    )
  }

  return (
    <GastosProviders>
      <QuietModeProvider>
        <Layout>
          <section className="space-y-6">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-3xl font-bold">Pulso</h1>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleToggleAjustes}
                  aria-pressed={showAjustes}
                  aria-label="Ajustes"
                  title="Ajustes"
                  className={`${iconButtonClassName} border ${
                    showAjustes
                      ? 'border-blue-500/50 bg-blue-500/15 text-blue-300'
                      : 'border-slate-600 text-slate-400 hover:border-slate-500 hover:text-white active:bg-slate-700'
                  }`}
                >
                  <SettingsIcon />
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  aria-label="Cerrar sesión"
                  title="Cerrar sesión"
                  className={`${iconButtonClassName} border border-slate-600 text-slate-400 hover:border-slate-500 hover:text-white active:bg-slate-700`}
                >
                  <LogOutIcon />
                </button>
              </div>
            </div>

            {!showAjustes && (
              <div
                className="hidden grid-cols-4 gap-1 rounded-xl border border-white/10 bg-pulso-surface/50 p-1 backdrop-blur-sm sm:grid"
                role="tablist"
                aria-label="Navegación principal"
              >
                {TABS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    id={`tab-${id}`}
                    aria-selected={tab === id}
                    aria-controls={`panel-${id}`}
                    onClick={() => handleTabChange(id)}
                    className={navTabClassName(tab === id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            <div className="relative" {...(!showAjustes ? swipeHandlers : {})}>
              {showAjustes ? (
                <ErrorBoundary title="Error en ajustes">
                  <Ajustes />
                </ErrorBoundary>
              ) : (
                <>
              <TabPanel id="registro" activeTab={tab}>
                <ErrorBoundary title="Error en el formulario">
                  <GastoForm />
                </ErrorBoundary>
              </TabPanel>

              <TabPanel id="resumen" activeTab={tab}>
                <FocusModeProvider>
                  <ErrorBoundary title="Error en el Dashboard">
                    <Dashboard />
                  </ErrorBoundary>
                </FocusModeProvider>
              </TabPanel>

              <TabPanel id="historial" activeTab={tab}>
                <ErrorBoundary title="Error en el historial">
                  <Historial />
                </ErrorBoundary>
              </TabPanel>

              <TabPanel id="plan" activeTab={tab}>
                <ErrorBoundary title="Error en planificación">
                  <Plan />
                </ErrorBoundary>
              </TabPanel>
                </>
              )}
            </div>

            {!showAjustes && (
              <nav
                className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-pulso-surface/95 backdrop-blur-md sm:hidden"
                role="tablist"
                aria-label="Navegación principal"
                style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
              >
                <div className="mx-auto grid max-w-lg grid-cols-4 gap-0.5 px-2 pt-1">
                  {TABS.map(({ id, shortLabel }) => (
                    <button
                      key={`bottom-${id}`}
                      type="button"
                      role="tab"
                      aria-selected={tab === id}
                      aria-controls={`panel-${id}`}
                      onClick={() => handleTabChange(id)}
                      className={navBottomTabClassName(tab === id)}
                    >
                      {shortLabel}
                    </button>
                  ))}
                </div>
              </nav>
            )}
          </section>
        </Layout>
      </QuietModeProvider>
    </GastosProviders>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
