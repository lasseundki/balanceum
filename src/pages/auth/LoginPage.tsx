import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch {
      setError('E-Mail oder Passwort falsch.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-subtle flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-accent rounded-xl mb-4 shadow-md">
            <span className="font-heading text-2xl font-bold text-text-inverse">B</span>
          </div>
          <h1 className="font-heading text-3xl font-bold text-text">Balanceum</h1>
          <p className="text-text-secondary text-sm mt-1 font-heading italic">Dein persönlicher Finanztracker</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-xl p-6 shadow-md space-y-4">
          <h2 className="font-heading text-xl font-semibold text-text">Anmelden</h2>

          {error && (
            <div className="bg-error-light text-error text-sm px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">E-Mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="name@beispiel.de"
              className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-text bg-surface focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-light"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Passwort</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-text bg-surface focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-light"
            />
          </div>

          <div className="text-right">
            <Link to="/forgot-password" className="text-xs text-accent hover:text-accent-hover font-medium">
              Passwort vergessen?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-text-inverse py-2.5 rounded-lg font-semibold text-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {loading ? 'Anmelden...' : 'Anmelden'}
          </button>
        </form>

        <p className="text-center text-sm text-text-secondary mt-4">
          Noch kein Konto?{' '}
          <Link to="/register" className="text-accent font-medium hover:text-accent-hover">
            Registrieren
          </Link>
        </p>
      </div>
    </div>
  )
}
