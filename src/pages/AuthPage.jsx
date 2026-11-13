import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, BrainCircuit, ShieldCheck, RotateCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Spinner } from '../components/common/States'

function generateCaptcha() {
  const ops = ['+', '-', '+']
  const op = ops[Math.floor(Math.random() * ops.length)]
  let a = Math.floor(Math.random() * 9) + 1
  let b = Math.floor(Math.random() * 9) + 1
  if (op === '-' && a < b) [a, b] = [b, a]
  let ans = 0
  if (op === '+') ans = a + b
  if (op === '-') ans = a - b
  return { q: `What is ${a} ${op} ${b}?`, answer: String(ans) }
}

function defaultLandingForUser(u) {
  return (u?.role || 'data_architect') === 'data_analyst' ? '/finance' : '/apps'
}

export default function AuthPage({ mode }) {
  const isReg = mode === 'register'
  const { user, login, register } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [f, setF] = useState({ email: '', name: '', password: '', role: 'data_architect' })
  const [captcha, setCaptcha] = useState(() => generateCaptcha())
  const [captchaInput, setCaptchaInput] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const refreshCaptcha = () => {
    setCaptcha(generateCaptcha())
    setCaptchaInput('')
  }

  if (user) return <Navigate to={defaultLandingForUser(user)} replace />

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(f.email)) return setErr('Enter a valid email address.')
    if (isReg && f.name.trim().length < 2) return setErr('Enter your name.')
    if (isReg && (f.password.length < 8 || !/[A-Za-z]/.test(f.password) || !/\d/.test(f.password))) {
      return setErr('Password needs 8+ characters with a letter and a number.')
    }
    if (!isReg && !f.password) return setErr('Enter your password.')
    if (!captchaInput.trim()) {
      return setErr('Please verify you are human.')
    }
    if (captchaInput.trim() !== captcha.answer) {
      refreshCaptcha()
      return setErr('Incorrect verification answer. Please try again.')
    }
    setBusy(true)
    try {
      const u = isReg ? await register(f.email, f.name, f.password, f.role) : await login(f.email, f.password)
      const isAnalyst = (u?.role || 'data_architect') === 'data_analyst'
      const from = loc.state?.from
      const safeFrom = from && from !== '/' && !(isAnalyst && from.startsWith('/apps')) ? from : null
      nav(safeFrom || defaultLandingForUser(u), { replace: true })
    } catch (e2) {
      setErr(e2.message)
    } finally {
      setBusy(false)
    }
  }

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[#141821] selection:bg-emerald-500 selection:text-black">
      {/* Centered Login Card */}
      <div className="w-full max-w-md rounded-2xl border border-[#333E52] bg-[#1E2531] p-6 sm:p-8 shadow-2xl shadow-black/40">
        {/* Top Icon: BrainCircuit icon retained inside emerald green badge */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-4 flex items-center justify-center">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#10b981] shadow-sm"
            >
              <BrainCircuit className="h-6 w-6 text-[#141821]" strokeWidth={2.4} />
            </div>
          </div>

          {/* Heading: 2 lines with action on line 1 and 'AgentForgeX Finance' on line 2 */}
          <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-white leading-tight">
            <span>{isReg ? 'Create account' : 'Sign in'}</span>
            <span className="block mt-1 bg-gradient-to-r from-[#34d399] via-[#2dd4bf] to-[#22d3ee] bg-clip-text text-transparent whitespace-nowrap">
              AgentForgeX Finance
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-2 text-sm text-neutral-400">
            {isReg ? 'Create your account to continue' : "Welcome back — let's get you to your workspace."}
          </p>
        </div>

        {/* Form Fields */}
        <form onSubmit={submit} className="space-y-4 sm:space-y-4.5" noValidate>
          {isReg && (
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-300" htmlFor="name">
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

              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-neutral-300">
                  Role
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { value: 'data_architect', label: 'Data Architect', desc: 'Build & publish models' },
                    { value: 'data_analyst', label: 'Data Analyst', desc: 'Explore published models' },
                  ].map((opt) => {
                    const active = f.role === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setF({ ...f, role: opt.value })}
                        className={`rounded-xl border px-3 py-2.5 text-left transition ${active
                            ? 'border-[#10b981] bg-[#10b981]/15 text-white'
                            : 'border-[#333E52] bg-[#141821] text-neutral-300 hover:border-neutral-500'
                          }`}
                      >
                        <div className="text-xs font-semibold">{opt.label}</div>
                        <div className="text-[11px] text-neutral-400 mt-0.5">{opt.desc}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Email Field */}
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-300" htmlFor="email">
              Email
            </label>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-3.5 flex items-center text-neutral-500">
                <Mail className="h-4 w-4" />
              </span>
              <input
                id="email"
                type="email"
                placeholder="name@company.com"
                className="auth-input-field w-full rounded-xl pl-10 pr-4 py-2.5 text-sm"
                value={f.email}
                onChange={set('email')}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-300" htmlFor="pw">
              Password
            </label>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-3.5 flex items-center text-neutral-500">
                <Lock className="h-4 w-4" />
              </span>
              <input
                id="pw"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="auth-input-field w-full rounded-xl pl-10 pr-11 py-2.5 text-sm"
                value={f.password}
                onChange={set('password')}
                autoComplete={isReg ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 flex items-center text-neutral-500 hover:text-neutral-300 transition focus:outline-none"
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

          {/* Verify You Are Human (Captcha) */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-neutral-400" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                VERIFY YOU ARE HUMAN
              </span>
            </div>

            {/* Row 1: Math Question Box (left) + Refresh Button (right) */}
            <div className="flex items-center gap-2.5">
              {/* Question Display Box */}
              <div className="flex-1 min-w-0 h-[42px] rounded-xl bg-[#222222] border border-[#2e2e2e] px-4 flex items-center">
                <span className="font-mono text-sm text-neutral-200 tracking-wider font-medium select-none">
                  {captcha.q}
                </span>
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={refreshCaptcha}
                className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-[#2e2e2e] bg-[#222222] hover:border-neutral-500 text-neutral-400 hover:text-neutral-200 transition focus:outline-none"
                title="New question"
                aria-label="New question"
              >
                <RotateCw className="h-4 w-4" />
              </button>
            </div>

            {/* Row 2: Full-width Answer Input */}
            <input
              id="captcha"
              type="text"
              placeholder="Type the answer"
              className="auth-input-field w-full h-[42px] rounded-xl px-4 text-sm"
              value={captchaInput}
              onChange={(e) => setCaptchaInput(e.target.value)}
              autoComplete="off"
            />
          </div>

          {/* Error Message */}
          {err && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-950/40 px-3.5 py-2.5 text-xs text-red-400 animate-in fade-in duration-200"
            >
              {err}
            </div>
          )}

          {/* Sign In Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={busy}
              className="auth-btn-gradient w-full flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-semibold cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? (
                <Spinner />
              ) : (
                <span>{isReg ? 'Create Account' : 'Sign In'}</span>
              )}
            </button>
          </div>
        </form>

        {/* Bottom Section */}
        <p className="mt-5 text-center text-xs text-neutral-400">
          {isReg ? 'Already registered?' : 'New to AgentForgeX Finance?'}{' '}
          <Link
            to={isReg ? '/login' : '/register'}
            className="font-semibold text-[#10b981] hover:text-[#34d399] transition underline-offset-2 hover:underline ml-1"
          >
            {isReg ? 'Sign in' : 'Create account'}
          </Link>
        </p>
      </div>
    </div>
  )
}
