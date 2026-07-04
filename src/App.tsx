import { lazy, Suspense, useEffect, useState, useCallback, type ReactNode } from 'react'
import { AuthProvider, GastosProviders, QuietModeProvider, FocusModeProvider, useAuthSession, useAuthActions } from './contexts'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'
import LoginForm from './components/LoginForm'
import { navTabClassName, navBottomTabClassName, iconButtonClassName, tabPanelClassName } from './components/formStyles'
import { TabHistorialIcon, TabPlanIcon, TabRegistroIcon, TabResumenIcon } from './components/icons'
import { useTabSwipe } from './hooks/useTabSwipe'
import { checkNeedsOnboarding } from './services/onboarding'
import { readSessionStorage, writeSessionStorage } from './utils/storage'
import { getWelcomeBackState, markAppVisit } from './utils/welcomeBack'
import { showError } from './utils/toast'

const GastoForm = lazy(() => import('./components/GastoForm'))
const Dashboard = lazy(() => import('./components/Dashboard'))
const Historial = lazy(() => import('./components/Historial'))
const Plan = lazy(() => import('./components/Plan'))
const Ajustes = lazy(() => import('./components/Ajustes'))
const OnboardingFlow = lazy(() => import('./components/OnboardingFlow'))

type AppTab = 'registro' | 'resumen' | 'historial' | 'plan'

const TAB_STORAGE_KEY = 'app-tab'

const VALID_TABS = new Set<AppTab>(['registro', 'resumen', 'historial', 'plan'])

const TABS: { id: AppTab; label: string; shortLabel: string; Icon: typeof TabRegistroIcon }[] = [
  { id: 'registro', label: 'Registro', shortLabel: 'Nuevo', Icon: TabRegistroIcon },
  { id: 'resumen', label: 'Resumen', shortLabel: 'Resumen', Icon: TabResumenIcon },
  { id: 'historial', label: 'Historial', shortLabel: 'Historial', Icon: TabHistorialIcon },
  { id: 'plan', label: 'Plan', shortLabel: 'Plan', Icon: TabPlanIcon },
]

function TabFallback() {
  return <p className="text-center text-sm text-slate-400">Cargando...</p>
}

function getInitialTab(): AppTab {
  const params = new URLSearchParams(window.location.search)
  if (params.has('q') || params.has('m') || params.get('tab') === 'registro') {
    writeSessionStorage(TAB_STORAGE_KEY, 'registro')
    return 'registro'
  }

  const tabParam = params.get('tab')
  if (tabParam && VALID_TABS.has(tabParam as AppTab)) {
    return tabParam as AppTab
  }

  const saved = readSessionStorage(TAB_STORAGE_KEY)
  if (saved === 'ajustes') {
    return 'resumen'
  }
  if (saved === 'recurrentes' || saved === 'metas') {
    return 'plan'
  }
  if (saved && VALID_TABS.has(saved as AppTab)) {
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
      <Suspense fallback={<TabFallback />}>{children}</Suspense>
    </div>
  )
}

function AppContent() {
  const { user, loading } = useAuthSession()
  const { signOut } = useAuthActions()
  const [tab, setTab] = useState<AppTab>(getInitialTab)
  const [showAjustes, setShowAjustes] = useState(false)
  const [onboardingState, setOnboardingState] = useState<OnboardingState>('loading')

  const handleTabChange = useCallback((nextTab: AppTab) => {
    setShowAjustes(false)
    setTab(nextTab)
    writeSessionStorage(TAB_STORAGE_KEY, nextTab)
  }, [])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<AppTab>).detail
      if (VALID_TABS.has(detail)) handleTabChange(detail)
    }
    window.addEventListener('pulso-navigate', handler)
    return () => window.removeEventListener('pulso-navigate', handler)
  }, [handleTabChange])

  const tabIndex = TABS.findIndex(({ id }) => id === tab)

  const handleSwipeLeft = useCallback(() => {
    if (showAjustes || tabIndex >= TABS.length - 1) return
    handleTabChange(TABS[tabIndex + 1].id)
  }, [showAjustes, tabIndex, handleTabChange])

  const handleSwipeRight = useCallback(() => {
    if (showAjustes || tabIndex <= 0) return
    handleTabChange(TABS[tabIndex - 1].id)
  }, [showAjustes, tabIndex, handleTabChange])

  const swipeHandlers = useTabSwipe(handleSwipeLeft, handleSwipeRight)

  const handleToggleAjustes = useCallback(() => {
    setShowAjustes((open) => !open)
  }, [])

  const handleSignOut = useCallback(async () => {
    const { error } = await signOut()
    if (error) {
      showError(`Error al cerrar sesión: ${error.message}`)
    }
  }, [signOut])

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

  useEffect(() => {
    if (!user || onboardingState !== 'done') return
    if (!getWelcomeBackState().show) markAppVisit()
  }, [user, onboardingState])

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
        <Suspense fallback={<TabFallback />}>
          <OnboardingFlow
            onComplete={() => {
              setOnboardingState('done')
              handleTabChange('resumen')
            }}
          />
        </Suspense>
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
                      ? 'border-pulso-accent/50 bg-pulso-accent/15 text-pulso-accent'
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
                  <Suspense fallback={<TabFallback />}>
                    <Ajustes />
                  </Suspense>
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
                  {TABS.map(({ id, label, Icon }) => (
                    <button
                      key={`bottom-${id}`}
                      type="button"
                      role="tab"
                      aria-selected={tab === id}
                      aria-label={label}
                      title={label}
                      aria-controls={`panel-${id}`}
                      onClick={() => handleTabChange(id)}
                      className={navBottomTabClassName(tab === id)}
                    >
                      <Icon />
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
