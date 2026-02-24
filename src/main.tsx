import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AlertProvider } from './contexts/AlertContext'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AlertProvider>
      <App />
    </AlertProvider>
  </StrictMode>,
)
