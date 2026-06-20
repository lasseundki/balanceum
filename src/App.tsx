import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth, ensureUserSeeded } from './contexts/AuthContext'
import BottomNav from './components/layout/BottomNav'
import AddTransactionModal from './components/modals/AddTransactionModal'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Analytics from './pages/Analytics'
import Cards from './pages/Cards'
import Settings from './pages/Settings'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'

function AppLayout() {
  const [showAdd, setShowAdd] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    if (user) ensureUserSeeded(user.uid)
  }, [user])

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-bg-subtle">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/cards" element={<Cards />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav onAdd={() => setShowAdd(true)} />
      {showAdd && <AddTransactionModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-bg-subtle">
      <div className="text-center">
        <div className="w-12 h-12 bg-accent rounded-xl mx-auto mb-3 flex items-center justify-center">
          <span className="font-heading text-xl font-bold text-text-inverse">B</span>
        </div>
        <p className="text-sm text-text-muted">Laden...</p>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/*" element={
        <RequireAuth>
          <AppLayout />
        </RequireAuth>
      } />
    </Routes>
  )
}
