import { AuthProvider, GastosRefreshProvider, useAuthContext } from './contexts'
import {
  Dashboard,
  ErrorBoundary,
  GastoForm,
  Historial,
  Layout,
  LoginForm,
} from './components'
import { showError } from './utils/toast'

function AppContent() {
  const { user, loading, signOut } = useAuthContext()

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
          <ErrorBoundary title="Error en el Dashboard">
            <Dashboard />
          </ErrorBoundary>
          <ErrorBoundary title="Error en el formulario">
            <GastoForm />
          </ErrorBoundary>
          <ErrorBoundary title="Error en el historial">
            <Historial />
          </ErrorBoundary>
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
