import { createContext, useContext, useState } from 'react'
import { syncBaseCurrency } from '../lib/currencyStore'

interface CurrencyContextType {
  baseCurrency: string
  setBaseCurrency: (code: string) => void
}

const CurrencyContext = createContext<CurrencyContextType | null>(null)

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [baseCurrency, setBaseCurrencyState] = useState(
    () => localStorage.getItem('balanceum_currency') ?? 'EUR'
  )

  const setBaseCurrency = (code: string) => {
    setBaseCurrencyState(code)
    syncBaseCurrency(code)
    localStorage.setItem('balanceum_currency', code)
  }

  return (
    <CurrencyContext.Provider value={{ baseCurrency, setBaseCurrency }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext)
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider')
  return ctx
}
