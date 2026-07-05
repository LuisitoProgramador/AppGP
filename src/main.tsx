import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import './index.css'
import App from './App'
import { queryClient } from './lib/queryClient'
import { installSafeAreaInsetListeners } from './utils/core/safeAreaInsets'
installSafeAreaInsetListeners()

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
