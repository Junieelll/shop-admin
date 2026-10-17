import { useEffect, useState } from 'react'
import { authClient } from '../lib/auth'
import { AuthContext } from './authContext'

// Fetch real user profile from DB (includes image which Neon Auth session may omit)
async function fetchUserFromDb(userId) {
  try {
    const res = await fetch('/api/user-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    })
    if (res.ok) {
      const data = await res.json()
      return data.user || null
    }
  } catch {
    // silently fail – fallback to session user
  }
  return null
}

// Merge DB user data and cached avatar into session user object
async function buildFullUser(sessionUser) {
  if (!sessionUser) return null

  // Always fetch from DB to get the latest image field
  const dbUser = await fetchUserFromDb(sessionUser.id)

  const merged = { ...sessionUser }
  if (dbUser?.image) {
    merged.image = dbUser.image
    localStorage.setItem('admin_user_avatar', dbUser.image)
  } else if (!merged.image) {
    // Last resort: use localStorage cache
    const cachedAvatar = localStorage.getItem('admin_user_avatar')
    if (cachedAvatar) merged.image = cachedAvatar
  } else {
    localStorage.setItem('admin_user_avatar', merged.image)
  }

  if (dbUser?.name) merged.name = dbUser.name
  if (dbUser?.email) merged.email = dbUser.email

  return merged
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Check for an existing session when the app loads
  useEffect(() => {
    let cancelled = false

    authClient.getSession().then(async ({ data }) => {
      if (cancelled) return
      const sessionUser = data?.user ? { ...data.user } : null
      const fullUser = await buildFullUser(sessionUser)
      if (!cancelled) {
        setUser(fullUser)
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  const signIn = async (email, password) => {
    const { error } = await authClient.signIn.email({ email, password })
    if (error) throw new Error(error.message || 'Invalid email or password')

    const { data } = await authClient.getSession()
    const sessionUser = data?.user ? { ...data.user } : null
    const fullUser = await buildFullUser(sessionUser)
    setUser(fullUser)
  }

  const refreshUser = async () => {
    try {
      const { data } = await authClient.getSession()
      const sessionUser = data?.user ? { ...data.user } : null
      const fullUser = await buildFullUser(sessionUser)
      setUser(fullUser)
      return fullUser
    } catch (err) {
      console.warn('Failed to refresh user session:', err)
      return null
    }
  }

  const updateLocalUser = (updatedData) => {
    setUser(prev => {
      const next = prev ? { ...prev, ...updatedData } : updatedData
      if (next?.image) {
        localStorage.setItem('admin_user_avatar', next.image)
      } else if (updatedData.image === '' || updatedData.image === null) {
        localStorage.removeItem('admin_user_avatar')
      }
      return next
    })
  }

  const signOut = async () => {
    await authClient.signOut()
    localStorage.removeItem('admin_user_avatar')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, refreshUser, updateLocalUser }}>
      {children}
    </AuthContext.Provider>
  )
}