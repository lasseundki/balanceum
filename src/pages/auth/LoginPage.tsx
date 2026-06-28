import { useState, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff } from 'lucide-react'
import { FirebaseError } from 'firebase/app'
import { setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth'
import { useAuth } from '../../contexts/AuthContext'
import { auth } from '../../firebase/config'
import { saveEmailToHistory, getEmailHistory } from '../../lib/noteHistory'

type ErrorType = 'credentials' | 'no-account' | 'too-many' | 'other'

export default function LoginPage() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState(searchParams.get('email') ?? getEmailHistory()[0] ?? '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [errorType, setErrorType] = useState<ErrorType | null>(null)
  const [loading, setLoading] = useState(false)

  const [emailFocused, setEmailFocused] = useState(false)
  const emailHistory = getEmailHistory()
  const suggestedEmails = emailFocused
    ? (email.trim()
      ? emailHistory.filter(e => e.toLowerCase().includes(email.toLowerCase()) && e !== email)
      : emailHistory)
    : []
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleEmailBlur() {
    blurTimeout.current = setTimeout(() => setEmailFocused(false), 150)
  }
  function handleEmailFocus() {
    if (blurTimeout.current) clearTimeout(blurTimeout.current)
    setEmailFocused(true)
  }
  function pickEmail(e: string) {
    setEmail(e)
    setEmailFocused(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorType(null)
    setLoading(true)
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence)
      await login(email, password)
      saveEmailToHistory(email)
      navigate('/')
    } catch (err) {
      if (err instanceof FirebaseError) {
        if (err.code === 'auth/user-not-found') {
          setErrorType('no-account')
        } else if (err.code === 'auth/too-many-requests') {
          setErrorType('too-many')
        } else {
          // auth/invalid-credential (new SDK combines user-not-found + wrong-password),
          // auth/wrong-password, etc.
          setErrorType('credentials')
        }
      } else {
        setErrorType('other')
      }
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
          <p className="text-text-secondary text-sm mt-1 font-heading italic">{t('auth.tagline')}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-xl p-6 shadow-md space-y-4">
          <h2 className="font-heading text-xl font-semibold text-text">{t('auth.loginTitle')}</h2>

          {/* Error messages */}
          {errorType === 'no-account' && (
            <div className="bg-error-light border border-error/20 text-error text-sm px-3 py-2.5 rounded-md space-y-1">
              <p>{t('auth.emailNotFound')}</p>
              <p>
                {t('auth.noAccount')}{' '}
                <Link to={`/register?email=${encodeURIComponent(email)}`} className="font-semibold underline underline-offset-2">
                  {t('auth.register')}
                </Link>
              </p>
            </div>
          )}
          {errorType === 'credentials' && (
            <div className="bg-error-light border border-error/20 text-error text-sm px-3 py-2.5 rounded-md space-y-1">
              <p>{t('auth.wrongCredentials')}</p>
              <p>
                {t('auth.noAccount')}{' '}
                <Link to={`/register?email=${encodeURIComponent(email)}`} className="font-semibold underline underline-offset-2">
                  {t('auth.register')}
                </Link>
              </p>
            </div>
          )}
          {errorType === 'too-many' && (
            <div className="bg-error-light border border-error/20 text-error text-sm px-3 py-2.5 rounded-md space-y-1">
              <p>{t('auth.tooManyRequests')}</p>
              <p>
                <Link to="/forgot-password" className="font-semibold underline underline-offset-2">
                  {t('auth.forgotPassword')}
                </Link>
              </p>
            </div>
          )}
          {errorType === 'other' && (
            <div className="bg-error-light border border-error/20 text-error text-sm px-3 py-2 rounded-md">
              {t('auth.wrongCredentials')}
            </div>
          )}

          {/* Email field with dropdown */}
          <div className="relative">
            <label className="block text-sm font-medium text-text mb-1.5">{t('auth.email')}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={handleEmailFocus}
              onBlur={handleEmailBlur}
              required
              placeholder="name@example.com"
              className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-text bg-surface focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-light"
            />
            {suggestedEmails.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-border rounded-lg shadow-lg z-10 overflow-hidden">
                {suggestedEmails.map(e => (
                  <button
                    key={e}
                    type="button"
                    onMouseDown={() => pickEmail(e)}
                    className="w-full text-left px-3 py-2.5 text-sm text-text hover:bg-bg-subtle transition-colors border-b border-border/50 last:border-0"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Password field with show/hide toggle */}
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">{t('auth.password')}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full border border-border rounded-md px-3 py-2.5 pr-10 text-sm text-text bg-surface focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-light"
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors p-1"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Remember me + forgot password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-border accent-accent"
              />
              <span className="text-xs text-text-secondary">{t('auth.rememberMe')}</span>
            </label>
            <Link to="/forgot-password" className="text-xs text-accent hover:text-accent-hover font-medium">
              {t('auth.forgotPassword')}
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-text-inverse py-2.5 rounded-lg font-semibold text-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {loading ? t('auth.loggingIn') : t('auth.login')}
          </button>
        </form>

        <p className="text-center text-sm text-text-secondary mt-4">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="text-accent font-medium hover:text-accent-hover">
            {t('auth.register')}
          </Link>
        </p>
      </div>
    </div>
  )
}
