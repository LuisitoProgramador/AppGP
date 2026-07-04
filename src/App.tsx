import { useEffect, useState, type ReactNode } from 'react'
import { AuthProvider, GastosProviders, QuietModeProvider, FocusModeProvider, useAuthContext } from './contexts'
import {
  Ajustes,
  Dashboard,
  ErrorBoundary,
  GastoForm,
  GastosRecurrentes,
  Historial,
  Layout,
  LoginForm,
  OnboardingFlow,
  SalidasTimelineSection,
} from './components'
import { navTabClassName, signOutButtonClassName, tabPanelClassName } from './components/formStyles'
import { checkNeedsOnboarding } from './services/onboarding'
import { readSessionStorage, writeSessionStorage } from './utils/storage'
import { showError } from './utils/toast'

type AppTab = 'registro' | 'resumen' | 'historial' | 'ajustes'

const TAB_STORAGE_KEY = 'app-tab'

const VALID_TABS: AppTab[] = ['registro', 'resumen', 'historial', 'ajustes']

const TABS: { id: AppTab; label: string }[] = [
  { id: 'registro', label: 'Registro' },
  { id: 'resumen', label: 'Resumen' },
  { id: 'historial', label: 'Historial' },
  { id: 'ajustes', label: 'Ajustes' },
]

function getInitialTab(): AppTab {
  const params = new URLSearchParams(window.location.search)
  if (params.has('q')) {
    writeSessionStorage(TAB_STORAGE_KEY, 'registro')
    return 'registro'
  }

  const saved = readSessionStorage(TAB_STORAGE_KEY)
  if (saved && VALID_TABS.includes(saved as AppTab)) {
    return saved as AppTab
  }
  return 'registro'
}

type OnboardingState = 'loading' | 'needed' | 'done'

interface TabPanelProps {
  id: AppTab
  activeTab: AppTab
  children: ReactNode
}

function TabPanel({ id, activeTab, children }: TabPanelProps) {
  const active = activeTab === id

  return (
    <div
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={`tab-${id}`}
      aria-hidden={!active}
      className={`${tabPanelClassName} ${
        active
          ? 'relative z-10 opacity-100'
          : 'pointer-events-none absolute inset-x-0 top-0 opacity-0'
      }`}
    >
      {children}
    </div>
  )
}

function AppContent() {
  const { user, loading, signOut } = useAuthContext()
  const [tab, setTab] = useState<AppTab>(getInitialTab)
  const [onboardingState, setOnboardingState] = useState<OnboardingState>('loading')

  function handleTabChange(nextTab: AppTab) {
    setTab(nextTab)
    writeSessionStorage(TAB_STORAGE_KEY, nextTab)
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
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-3xl font-bold">Pulso</h1>
              <button
                type="button"
                onClick={handleSignOut}
                className={signOutButtonClassName}
              >
                Salir
              </button>
            </div>

            <div
              className="grid grid-cols-4 gap-1 rounded-xl border border-white/10 bg-slate-800/50 p-1 backdrop-blur-sm"
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

            <div className="relative">
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
                  <ErrorBoundary title="Error en salidas del mes">
                    <SalidasTimelineSection />
                  </ErrorBoundary>
                  <ErrorBoundary title="Error en gastos recurrentes">
                    <GastosRecurrentes />
                  </ErrorBoundary>
                </FocusModeProvider>
              </TabPanel>

              <TabPanel id="historial" activeTab={tab}>
                <ErrorBoundary title="Error en el historial">
                  <Historial />
                </ErrorBoundary>
              </TabPanel>

              <TabPanel id="ajustes" activeTab={tab}>
                <ErrorBoundary title="Error en ajustes">
                  <Ajustes />
                </ErrorBoundary>
              </TabPanel>
            </div>
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
