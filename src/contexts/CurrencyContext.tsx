import { createContext, useContext, useState, useEffect } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from './AuthContext'
import { syncBaseCurrency } from '../lib/currencyStore'
import { setNoteSyncUid, mergeRemoteNotes } from '../lib/noteHistory'

interface CurrencyContextType {
  baseCurrency: string
  setBaseCurrency: (code: string) => void
}

const CurrencyContext = createContext<CurrencyContextType | null>(null)

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [baseCurrency, setBaseCurrencyState] = useState(
    () => localStorage.getItem('balanceum_currency') ?? 'EUR'
  )

  // On login: sync uid for note history, load prefs from Firestore
  useEffect(() => {
    if (!user) {
      setNoteSyncUid(null)
      return
    }
    setNoteSyncUid(user.uid)
    const prefsRef = doc(db, 'users', user.uid, 'settings', 'prefs')
    getDoc(prefsRef).then(snap => {
      const data = snap.data()
      const currency = data?.baseCurrency as string | undefined
      if (currency) {
        setBaseCurrencyState(currency)
        syncBaseCurrency(currency)
        localStorage.setItem('balanceum_currency', currency)
      } else {
        // Bootstrap: user set currency before Firestore sync was deployed
        const local = localStorage.getItem('balanceum_currency')
        if (local) setDoc(prefsRef, { baseCurrency: local }, { merge: true }).catch(() => {})
      }
      const notes = data?.noteHistory as string[] | undefined
      if (notes?.length) mergeRemoteNotes(notes)
    })
  }, [user?.uid])

  const setBaseCurrency = (code: string) => {
    setBaseCurrencyState(code)
    syncBaseCurrency(code)
    localStorage.setItem('balanceum_currency', code)
    if (user) {
      const prefsRef = doc(db, 'users', user.uid, 'settings', 'prefs')
      setDoc(prefsRef, { baseCurrency: code }, { merge: true }).catch(() => {})
    }
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
