import { AuthProvider } from './contexts'
import AppRoutes from './components/app/AppRoutes'

function App() {
  return (
    <AuthProvider>
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <AppRoutes />
      </div>
    </AuthProvider>
  )
}

export default App
