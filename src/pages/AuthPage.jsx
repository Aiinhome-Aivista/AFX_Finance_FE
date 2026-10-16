import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, BrainCircuit } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Spinner } from '../components/common/States'

export default function AuthPage({ mode }) {
  const isReg = mode === 'register'
  const { user, login, register } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [f, setF] = useState({ email: '', name: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={user.selected_app ? '/finance' : '/apps'} replace />

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(f.email)) return setErr('Enter a valid email address.')
    if (isReg && f.name.trim().length < 2) return setErr('Enter your name.')
    if (isReg && (f.password.length < 8 || !/[A-Za-z]/.test(f.password) || !/\d/.test(f.password))) {
      return setErr('Password needs 8+ characters with a letter and a number.')
    }
    if (!isReg && !f.password) return setErr('Enter your password.')
    setBusy(true)
    try {
      const u = isReg ? await register(f.email, f.name, f.password) : await login(f.email, f.password)
      nav(loc.state?.from || (u.selected_app ? '/finance' : '/apps'), { replace: true })
    } catch (e2) {
      setErr(e2.message)
    } finally {
      setBusy(false)
    }
  }

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-white selection:bg-purple-500 selection:text-white">
      {/* Centered Login Card */}
      <div className="w-full max-w-[420px] rounded-2xl border border-slate-200/80 bg-white p-7 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
        {/* Top Icon: Glowing purple-blue AI brain/network icon centered at the top */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-4 flex items-center justify-center">
            {/* Glowing background blur effect */}
            <div
              className="absolute -inset-2 rounded-full opacity-60 blur-md"
              style={{
                background: 'linear-gradient(135deg, rgba(69, 101, 255, 0.4) 0%, rgba(139, 92, 246, 0.5) 100%)',
              }}
              aria-hidden="true"
            />
            <div
              className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-100 shadow-sm"
              style={{
                background: 'linear-gradient(135deg, #1E1B4B 0%, #0F172A 100%)',
                boxShadow: '0 4px 14px rgba(69, 101, 255, 0.25)',
              }}
            >
              <BrainCircuit className="h-7 w-7 text-[#A78BFA] drop-shadow-[0_0_8px_rgba(167,139,250,0.6)]" strokeWidth={2.1} />
            </div>
          </div>

          {/* Heading with bold purple gradient text */}
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-800 bg-clip-text text-transparent">
            Finance Knowledge Graph
          </h1>

          {/* Subtitle in muted light gray */}
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            {isReg ? 'Create your account to continue' : 'Sign in to continue'}
          </p>
        </div>

        {/* Form Fields */}
        <form onSubmit={submit} className="space-y-4" noValidate>
          {isReg && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700" htmlFor="name">
                Full Name
              </label>
              <div className="relative">
                <input
                  id="name"
                  type="text"
                  placeholder="Your Name"
                  className="auth-input-field w-full rounded-xl px-4 py-2.5 text-sm"
                  value={f.name}
                  onChange={set('name')}
                  autoComplete="name"
                />
              </div>
            </div>
          )}

          {/* Email Field */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700" htmlFor="email">
              Email
            </label>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-3.5 flex items-center text-slate-400">
                <Mail className="h-4 w-4" />
              </span>
              <input
                id="email"
                type="email"
                placeholder="user@domain.com"
                className="auth-input-field w-full rounded-xl pl-10 pr-4 py-2.5 text-sm"
                value={f.email}
                onChange={set('email')}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700" htmlFor="pw">
              Password
            </label>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-3.5 flex items-center text-slate-400">
                <Lock className="h-4 w-4" />
              </span>
              <input
                id="pw"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                className="auth-input-field w-full rounded-xl pl-10 pr-11 py-2.5 text-sm"
                value={f.password}
                onChange={set('password')}
                autoComplete={isReg ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 flex items-center text-slate-400 hover:text-slate-200 transition focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {err && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-600 animate-in fade-in duration-200"
            >
              {err}
            </div>
          )}

          {/* Sign In Button */}
          <div className="pt-1.5">
            <button
              type="submit"
              disabled={busy}
              className="auth-btn-gradient w-full flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-sm font-semibold text-white cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? (
                <Spinner />
              ) : (
                <span>{isReg ? 'Create account →' : 'Sign in →'}</span>
              )}
            </button>
          </div>
        </form>

        {/* Bottom Section */}
        <p className="mt-5 text-center text-xs text-slate-500">
          {isReg ? (
            <>
              Already registered?{' '}
              <Link
                to="/login"
                className="font-semibold text-[#753BFF] hover:text-[#5B21B6] transition underline-offset-2 hover:underline ml-1"
              >
                Sign in
              </Link>
            </>
          ) : (
            <>
              New here?{' '}
              <Link
                to="/register"
                className="font-semibold text-[#753BFF] hover:text-[#5B21B6] transition underline-offset-2 hover:underline ml-1"
              >
                Create an account
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  )
}


