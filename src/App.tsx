import { AuthProvider } from './contexts'
import AppRoutes from './components/app/AppRoutes'

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
