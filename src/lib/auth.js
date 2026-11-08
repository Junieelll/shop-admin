// Browser auth client. No database access and no password handling here:
// everything goes through /api/auth, and the session lives in an HttpOnly cookie.

// Clean up the old fake session from the previous version
try {
  localStorage.removeItem('shop_admin_session')
} catch {
  // ignore
}

async function request(action, { method = 'POST', body } = {}) {
  try {
    const res = await fetch(`/api/auth?action=${action}`, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { data: null, error: { message: data.error || `Request failed (${res.status})` } }
    }
    return { data, error: null }
  } catch (err) {
    return { data: null, error: { message: err.message || 'Network error' } }
  }
}

export const authClient = {
  async getSession() {
    const { data, error } = await request('me', { method: 'GET' })
    return { data: { user: data?.user || null }, error }
  },

  signIn: {
    async email({ email, password }) {
      if (!email || !password) {
        return { data: null, error: { message: 'Email and password are required' } }
      }
      return request('login', { body: { email, password } })
    },
  },

  // Public sign-up is disabled. Create admins with scripts/create-admin.mjs.
  signUp: {
    async email() {
      return { data: null, error: { message: 'Sign-up is disabled' } }
    },
  },

  async updateUser(updates) {
    return request('update-profile', { body: updates })
  },

  async changePassword({ currentPassword, newPassword }) {
    const { error } = await request('change-password', { body: { currentPassword, newPassword } })
    return { error }
  },

  async signOut() {
    await request('logout')
    return { error: null }
  },
}