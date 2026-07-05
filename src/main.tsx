import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import './index.css'
import App from './App'
import { queryClient } from './lib/queryClient'
import { initSentry } from './lib/sentry'
import { installSafeAreaInsetListeners } from './utils/core/safeAreaInsets'
import { registerSW } from 'virtual:pwa-register'

initSentry()
installSafeAreaInsetListeners()

if (import.meta.env.PROD) {
  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      const checkForUpdate = () => {
        registration.update().catch(() => {})
      }
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForUpdate()
      })
      window.addEventListener('focus', checkForUpdate)
    },
  })
}

const root = createRoot(document.getElementById('root')!)
root.render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        theme="dark"
        position="top-center"
        closeButton
        visibleToasts={1}
        gap={8}
        mobileOffset={{
          top: 'max(0.75rem, env(safe-area-inset-top))',
        }}
        offset={{
          top: 'max(0.75rem, env(safe-area-inset-top))',
        }}
      />
    </QueryClientProvider>
  </StrictMode>,
)

const modalRoot = document.createElement('div')
modalRoot.id = 'modal-root'
document.body.appendChild(modalRoot)
