import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { useToast } from '../context/ToastContext'

export default function Login() {
  const { user, signIn } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  
  // Lazy state initializers - reads from localStorage on initial render without cascading re-renders
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem('admin_remember_email') || ''
    } catch {
      return ''
    }
  })
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return Boolean(localStorage.getItem('admin_remember_email'))
    } catch {
      return false
    }
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  const onSubmit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await signIn(email, password)
      
      if (rememberMe) {
        localStorage.setItem('admin_remember_email', email)
      } else {
        localStorage.removeItem('admin_remember_email')
      }

      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || 'Invalid email or password')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#09090b] relative overflow-hidden font-['Poppins']">
      {/* Subtle background ambient glow for depth */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-neutral-800/30 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Login Card - Designed matching the reference */}
      <div className="relative w-full max-w-[420px] bg-[#f8f9fa] text-neutral-900 rounded-[32px] p-7 sm:p-9 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] border border-white/20 transition-all">
        
        {/* Header*/}
        <div className="flex items-center justify-center mb-8">
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight m-0">
            Log in
          </h1>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Email Input */}
          <div>
            <div className="relative">
              <input
                id="email"
                type="email"
                required
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#f1f3f5] hover:bg-[#eceef1] focus:bg-white text-neutral-900 placeholder:text-neutral-400 font-medium px-4 py-3.5 rounded-2xl border border-transparent focus:border-neutral-300 focus:ring-2 focus:ring-black/10 outline-none transition-all text-sm"
              />
            </div>
          </div>

          {/* Password Input with Visibility Toggle */}
          <div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#f1f3f5] hover:bg-[#eceef1] focus:bg-white text-neutral-900 placeholder:text-neutral-400 font-medium pl-4 pr-11 py-3.5 rounded-2xl border border-transparent focus:border-neutral-300 focus:ring-2 focus:ring-black/10 outline-none transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition-colors p-1 focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  /* Eye off icon */
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  /* Eye open icon */
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Remember Me & Forgot Password Row */}
          <div className="flex items-center justify-between pt-1 pb-2 text-xs">
            {/* Custom Checkbox */}
            <label className="group flex items-center gap-2.5 cursor-pointer select-none text-neutral-600 hover:text-neutral-900 transition-colors">
              <div className="relative flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="sr-only peer"
                />
                <div
                  className={`w-[19px] h-[19px] rounded-md border transition-all duration-200 flex items-center justify-center ${
                    rememberMe
                      ? 'bg-black border-black text-white shadow-xs'
                      : 'bg-[#f1f3f5] border-neutral-300 group-hover:border-neutral-400'
                  } peer-focus-visible:ring-2 peer-focus-visible:ring-black/30`}
                >
                  <svg
                    className={`w-3.5 h-3.5 text-white transition-all duration-200 ${
                      rememberMe ? 'scale-100 opacity-100 stroke-[3]' : 'scale-50 opacity-0'
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>
              <span className="font-medium text-neutral-700 group-hover:text-neutral-900">Remember me</span>
            </label>

            <button
              type="button"
              onClick={() => showToast('Please contact system administrator to reset credentials.', 'info')}
              className="text-neutral-500 hover:text-black font-medium transition-colors cursor-pointer"
            >
              Forgot your password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-black hover:bg-neutral-800 active:scale-[0.99] text-white font-medium py-3.5 px-4 rounded-2xl shadow-md shadow-black/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm"
          >
            {busy ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Signing in...</span>
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>

        {/* Bottom Section with Divider - Setup hidden */}
        <div className="mt-8 pt-5 border-t border-neutral-200/70 text-center">
          <p className="text-xs text-neutral-400 font-medium tracking-wide">
            Admin Access Portal &bull; Authorized personnel only
          </p>
        </div>

      </div>
    </div>
  )
}
