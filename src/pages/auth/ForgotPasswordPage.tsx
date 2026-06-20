import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await resetPassword(email)
      setSent(true)
    } catch {
      setError(t('auth.emailNotFound'))
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
        </div>

        <div className="bg-surface border border-border rounded-xl p-6 shadow-md">
          {sent ? (
            <div className="text-center space-y-3">
              <CheckCircle size={40} className="text-accent mx-auto" />
              <h2 className="font-heading text-xl font-semibold text-text">{t('auth.emailSent')}</h2>
              <p className="text-sm text-text-secondary"
                dangerouslySetInnerHTML={{ __html: t('auth.emailSentDesc', { email: `<strong>${email}</strong>` }) }}
              />
              <Link to="/login" className="block mt-4 text-accent font-medium text-sm hover:text-accent-hover">
                {t('auth.backToLogin')}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="font-heading text-xl font-semibold text-text">{t('auth.forgotTitle')}</h2>
              <p className="text-sm text-text-secondary">{t('auth.forgotDesc')}</p>

              {error && (
                <div className="bg-error-light text-error text-sm px-3 py-2 rounded-md">{error}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-text mb-1.5">{t('auth.email')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="name@example.com"
                  className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-text bg-surface focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-light"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-accent text-text-inverse py-2.5 rounded-lg font-semibold text-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {loading ? t('auth.sending') : t('auth.sendReset')}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-text-secondary mt-4">
          <Link to="/login" className="text-accent font-medium hover:text-accent-hover">
            {t('auth.backToLogin')}
          </Link>
        </p>
      </div>
    </div>
  )
}
