import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authClient } from '../lib/auth'

/**
 * One-time setup page to create the initial admin account.
 * 
 * Visit /setup to create your admin account with email + password.
 * After creating the account, you can delete this page or remove
 * the /setup route from App.jsx.
 */
export default function Setup() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setSuccess('')

    try {
      const result = await authClient.signUp.email({
        email,
        password,
        name,
      })

      if (result.error) {
        throw new Error(result.error.message || 'Sign up failed')
      }

      setSuccess('Admin account created successfully! Redirecting to login...')
      setTimeout(() => navigate('/login', { replace: true }), 2000)
    } catch (err) {
      setError(err.message || 'Failed to create account')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50 px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white p-8 rounded-2xl shadow space-y-4">
        <h1 className="text-xl font-semibold">Create Admin Account</h1>
        <p className="text-sm text-gray-500">
          One-time setup — create your admin login credentials.
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}

        <input
          type="text"
          required
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
        />
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
        />
        <button
          disabled={busy}
          className="w-full bg-black text-white rounded-lg py-2 disabled:opacity-50"
        >
          {busy ? 'Creating account…' : 'Create Admin Account'}
        </button>
      </form>
    </div>
  )
}
