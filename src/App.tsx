import { useState } from 'react'
import { AuthProvider, GastosRefreshProvider, useAuthContext } from './contexts'
import {
  Dashboard,
  ErrorBoundary,
  GastoForm,
  GastosRecurrentes,
  Historial,
  Layout,
  LoginForm,
} from './components'
import { showError } from './utils/toast'

type AppTab = 'registro' | 'resumen' | 'historial'

const TAB_STORAGE_KEY = 'app-tab'

const VALID_TABS: AppTab[] = ['registro', 'resumen', 'historial']

function getInitialTab(): AppTab {
  const params = new URLSearchParams(window.location.search)
  if (params.has('q')) return 'registro'

  const saved = sessionStorage.getItem(TAB_STORAGE_KEY)
  if (saved && VALID_TABS.includes(saved as AppTab)) {
    return saved as AppTab
  }
  return 'registro'
}

function AppContent() {
  const { user, loading, signOut } = useAuthContext()
  const [tab, setTab] = useState<AppTab>(getInitialTab)

  function handleTabChange(nextTab: AppTab) {
    setTab(nextTab)
    sessionStorage.setItem(TAB_STORAGE_KEY, nextTab)
  }

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
          <h1 className="text-center text-3xl font-bold">Mi Presupuesto</h1>
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

  return (
    <GastosRefreshProvider>
      <Layout>
        <section className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-3xl font-bold">Mi Presupuesto</h1>
            <button
              type="button"
              onClick={handleSignOut}
              className="shrink-0 rounded-lg px-3 py-1.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              Salir
            </button>
          </div>
          <p className="text-sm text-slate-400">{user.email}</p>

          <div
            className="flex rounded-xl border border-slate-700/80 bg-slate-800/60 p-1"
            role="tablist"
            aria-label="Navegación principal"
          >
            {(
              [
                { id: 'registro', label: 'Registro' },
                { id: 'resumen', label: 'Resumen' },
                { id: 'historial', label: 'Historial' },
              ] as const
            ).map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => handleTabChange(id)}
                className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                  tab === id
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-6 transition-opacity duration-200">
            {tab === 'registro' && (
              <ErrorBoundary title="Error en el formulario">
                <GastoForm />
              </ErrorBoundary>
            )}
            {tab === 'resumen' && (
              <>
                <ErrorBoundary title="Error en el Dashboard">
                  <Dashboard />
                </ErrorBoundary>
                <ErrorBoundary title="Error en gastos recurrentes">
                  <GastosRecurrentes />
                </ErrorBoundary>
              </>
            )}
            {tab === 'historial' && (
              <ErrorBoundary title="Error en el historial">
                <Historial />
              </ErrorBoundary>
            )}
          </div>
        </section>
      </Layout>
    </GastosRefreshProvider>
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
