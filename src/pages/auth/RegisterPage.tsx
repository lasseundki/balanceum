import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { setError('Passwort muss mindestens 6 Zeichen haben.'); return }
    setError('')
    setLoading(true)
    try {
      await register(email, password, name.trim())
      navigate('/')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('email-already-in-use')) {
        setError('Diese E-Mail ist bereits registriert.')
      } else {
        setError('Registrierung fehlgeschlagen. Bitte erneut versuchen.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-subtle flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-accent rounded-xl mb-4 shadow-md">
            <span className="font-heading text-2xl font-bold text-text-inverse">B</span>
          </div>
          <h1 className="font-heading text-3xl font-bold text-text">Balanceum</h1>
          <p className="text-text-secondary text-sm mt-1 font-heading italic">Dein persönlicher Finanztracker</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-xl p-6 shadow-md space-y-4">
          <h2 className="font-heading text-xl font-semibold text-text">Konto erstellen</h2>

          {error && (
            <div className="bg-error-light text-error text-sm px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="Max Mustermann"
              className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-text bg-surface focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-light"
            />
          </div>

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
              placeholder="Mindestens 6 Zeichen"
              className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-text bg-surface focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-light"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-text-inverse py-2.5 rounded-lg font-semibold text-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {loading ? 'Registrieren...' : 'Konto erstellen'}
          </button>
        </form>

        <p className="text-center text-sm text-text-secondary mt-4">
          Bereits ein Konto?{' '}
          <Link to="/login" className="text-accent font-medium hover:text-accent-hover">
            Anmelden
          </Link>
        </p>
      </div>
    </div>
  )
}
