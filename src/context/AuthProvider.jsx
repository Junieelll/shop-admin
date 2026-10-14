import { useEffect, useState } from 'react'
import { authClient } from '../lib/auth'
import { AuthContext } from './authContext'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Check for an existing session when the app loads
  useEffect(() => {
    let cancelled = false

    authClient.getSession().then(({ data }) => {
      if (cancelled) return
      setUser(data?.user ?? null)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const signIn = async (email, password) => {
    const { error } = await authClient.signIn.email({ email, password })
    if (error) throw new Error(error.message || 'Invalid email or password')

    const { data } = await authClient.getSession()
    setUser(data?.user ?? null)
  }

  const refreshUser = async () => {
    try {
      const { data } = await authClient.getSession()
      setUser(data?.user ?? null)
      return data?.user ?? null
    } catch (err) {
      console.warn('Failed to refresh user session:', err)
      return null
    }
  }

  const updateLocalUser = (updatedData) => {
    setUser(prev => (prev ? { ...prev, ...updatedData } : updatedData))
  }

  const signOut = async () => {
    await authClient.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, refreshUser, updateLocalUser }}>
      {children}
    </AuthContext.Provider>
  )
}