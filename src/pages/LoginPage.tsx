import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { user, loading, signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-sm font-semibold text-slate-500">Laden...</p>
      </div>
    )
  }

  if (user) return <Navigate to="/" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        await signUp(email, password)
      }
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4">
      <div className="w-full max-w-sm rounded-3xl border border-white/70 bg-white/60 p-8 shadow-xl backdrop-blur-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">KotStart</h1>
          <p className="mt-1 text-sm text-slate-500">
            {mode === 'login' ? 'Welkom terug' : 'Maak een account aan'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-xs font-semibold text-slate-600">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-xs font-semibold text-slate-600">
              Wachtwoord
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? 'Even geduld...' : mode === 'login' ? 'Inloggen' : 'Registreren'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null) }}
          className="mt-6 w-full text-center text-xs font-semibold text-blue-600 hover:underline"
        >
          {mode === 'login' ? 'Account aanmaken' : 'Al een account? Inloggen'}
        </button>
      </div>
    </div>
  )
}

function authErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return 'Er is iets misgegaan'

  const message = error.message.toLowerCase()
  if (message.includes('load failed') || message.includes('failed to fetch')) {
    return 'Verbinding met Supabase mislukt. Controleer je internetverbinding en probeer opnieuw.'
  }
  if (message.includes('email rate limit')) {
    return 'Er zijn te veel registratiemails verstuurd. Wacht even en probeer opnieuw.'
  }
  if (message.includes('invalid') && message.includes('email')) {
    return 'Gebruik een geldig e-mailadres. Cloudcast gebruikt cloudcastanalytics.com zonder streepje.'
  }
  if (message.includes('already registered') || message.includes('already been registered')) {
    return 'Dit e-mailadres is al geregistreerd. Log in of gebruik wachtwoordherstel.'
  }
  if (message.includes('password')) {
    return 'Gebruik een sterker wachtwoord.'
  }

  return error.message
}
