import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AlertProvider } from './contexts/AlertContext'
import { ThemeProvider } from './contexts/ThemeContext'
import './index.css'
import './lib/i18n'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AlertProvider>
        <App />
      </AlertProvider>
    </ThemeProvider>
  </StrictMode>,
)
