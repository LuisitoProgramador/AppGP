import { Suspense, useEffect, useState, useCallback, type ReactNode } from 'react'
import { lazyWithRetry } from '../../utils/core/lazyWithRetry'
import {
  GastosProviders,
  QuietModeProvider,
  FocusModeProvider,
  useAuthSession,
  useAuthActions,
} from '../../contexts'
import ErrorBoundary from '../ui/ErrorBoundary'
import Layout from '../layout/Layout'
import TopNav from '../ui/TopNav'
import LoginForm from '../auth/LoginForm'
import {
  iconButtonClassName,
  tabPanelClassName,
} from '../ui/formStyles'
import { TabHistorialIcon, TabPlanIcon, TabRegistroIcon, TabResumenIcon } from '../ui/icons'
import { useTabSwipe } from '../../hooks/useTabSwipe'
import { checkNeedsOnboarding } from '../../services/onboarding'
import { readSessionStorage, writeSessionStorage } from '../../utils/core/storage'
import { getWelcomeBackState, markAppVisit } from '../../utils/dashboard/welcomeBack'
import { showError } from '../../utils/core/toast'

const GastoForm = lazyWithRetry(() => import('../GastoForm'))
const Dashboard = lazyWithRetry(() => import('../Dashboard'))
const Historial = lazyWithRetry(() => import('../Historial'))
const Plan = lazyWithRetry(() => import('../Plan'))
const Ajustes = lazyWithRetry(() => import('../Ajustes'))
const OnboardingFlow = lazyWithRetry(() => import('../onboarding/OnboardingFlow'))

export type AppTab = 'registro' | 'resumen' | 'historial' | 'plan'

export const TAB_STORAGE_KEY = 'app-tab'

export const VALID_TABS = new Set<AppTab>(['registro', 'resumen', 'historial', 'plan'])

export const TABS: {
  id: AppTab
  label: string
  shortLabel: string
  Icon: typeof TabRegistroIcon
}[] = [
  { id: 'registro', label: 'Registro', shortLabel: 'Nuevo', Icon: TabRegistroIcon },
  { id: 'resumen', label: 'Resumen', shortLabel: 'Resumen', Icon: TabResumenIcon },
  { id: 'historial', label: 'Historial', shortLabel: 'Historial', Icon: TabHistorialIcon },
  { id: 'plan', label: 'Plan', shortLabel: 'Plan', Icon: TabPlanIcon },
]

function TabFallback() {
  return <p className="text-center text-sm text-slate-400">Cargando...</p>
}

export function getInitialTab(): AppTab {
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

export default function AppRoutes() {
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

  useTabSwipe(handleSwipeLeft, handleSwipeRight, !showAjustes)

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
        <div className="app-scroll flex-1 min-h-0">
          <p className="text-center text-slate-400">Cargando...</p>
        </div>
      </Layout>
    )
  }

  if (!user) {
    return (
      <Layout>
        <div className="app-scroll flex-1 min-h-0">
          <section className="space-y-6">
            <h1 className="text-center text-3xl font-bold">Pulso</h1>
            <LoginForm />
          </section>
        </div>
      </Layout>
    )
  }

  if (onboardingState === 'loading') {
    return (
      <Layout>
        <div className="app-scroll flex-1 min-h-0">
          <p className="text-center text-slate-400">Preparando tu espacio...</p>
        </div>
      </Layout>
    )
  }

  if (onboardingState === 'needed') {
    return (
      <Layout>
        <div className="app-scroll flex-1 min-h-0">
          <Suspense fallback={<TabFallback />}>
            <OnboardingFlow
              onComplete={() => {
                setOnboardingState('done')
                handleTabChange('resumen')
              }}
            />
          </Suspense>
        </div>
      </Layout>
    )
  }

  return (
    <GastosProviders>
      <QuietModeProvider>
        <>
          <Layout>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <header className="shrink-0 space-y-4 pb-3">
                <div className="flex items-center justify-between gap-3">
                  <h1 className="text-2xl font-bold sm:text-3xl">Pulso</h1>
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
                          : 'border-slate-600 text-slate-400 active:border-slate-500 active:text-white active:bg-slate-700'
                      }`}
                    >
                      <SettingsIcon />
                    </button>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      aria-label="Cerrar sesión"
                      title="Cerrar sesión"
                      className={`${iconButtonClassName} border border-slate-600 text-slate-400 active:border-slate-500 active:text-white active:bg-slate-700`}
                    >
                      <LogOutIcon />
                    </button>
                  </div>
                </div>

                {!showAjustes && <TopNav activeTab={tab} onChange={handleTabChange} />}
              </header>

              <div className="app-scroll min-h-0 flex-1">
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
            </div>
          </Layout>
        </>
      </QuietModeProvider>
    </GastosProviders>
  )
}
