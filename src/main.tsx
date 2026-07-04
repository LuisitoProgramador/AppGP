import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import './index.css'
import App from './App'

const root = createRoot(document.getElementById('root')!)
root.render(
  <StrictMode>
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
  </StrictMode>,
)

const modalRoot = document.createElement('div')
modalRoot.id = 'modal-root'
document.body.appendChild(modalRoot)
