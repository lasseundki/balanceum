import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AccessibilityProvider } from './contexts/AccessibilityContext'
import { CurrencyProvider } from './contexts/CurrencyContext'
import App from './App'
import './i18n'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <AccessibilityProvider>
          <CurrencyProvider>
            <App />
          </CurrencyProvider>
        </AccessibilityProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
