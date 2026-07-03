import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import './index.css'
import App from './App'

const root = document.getElementById('root')!
root.render(
  <StrictMode>
    <App />
    <Toaster theme="dark" position="top-center" richColors closeButton />
  </StrictMode>,
)

const modalRoot = document.createElement('div')
modalRoot.id = 'modal-root'
document.body.appendChild(modalRoot)
