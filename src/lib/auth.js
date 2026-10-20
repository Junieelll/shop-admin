// Database-backed custom authentication client using Turso SQLite
// Irreversible cryptographic hashing using Web Crypto PBKDF2-HMAC-SHA256 with per-user salt
import { db } from './api.js'

const STORAGE_SESSION_KEY = 'shop_admin_session'

/**
 * Hash a password using PBKDF2-HMAC-SHA256 with 100,000 iterations and 16-byte unique salt
 */
export async function hashPassword(password, saltHex = null) {
  const encoder = new TextEncoder()
  const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : window.crypto

  const salt = saltHex
    ? new Uint8Array(saltHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))
    : cryptoObj.getRandomValues(new Uint8Array(16))

  const keyMaterial = await cryptoObj.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )

  const derivedBits = await cryptoObj.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  )

  const hashHex = Array.from(new Uint8Array(derivedBits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  const saltString = Array.from(salt)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return `${saltString}:${hashHex}`
}

/**
 * Verify a plain password against an irreversible stored PBKDF2 hash
 */
export async function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return false
  // Legacy migration check: if stored hash doesn't contain salt delimiter
  if (!storedHash.includes(':')) {
    return password === storedHash
  }
  const [saltString] = storedHash.split(':')
  const computed = await hashPassword(password, saltString)
  return computed === storedHash
}

function getStoredSession() {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(STORAGE_SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw)
    if (session?.user?.id) return session
    return null
  } catch {
    return null
  }
}

function saveSession(user) {
  const session = {
    user: {
      id: user?.id,
      name: user?.name,
      email: user?.email,
      image: user?.image || null,
      role: user?.role || 'admin',
    },
    token: 'turso_token_' + Math.random().toString(36).substring(2),
    createdAt: new Date().toISOString(),
  }

  try {
    if (typeof localStorage !== 'undefined') {
      if (!user) {
        localStorage.removeItem(STORAGE_SESSION_KEY)
      } else {
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session))
      }
    }
  } catch (err) {
    console.error('Failed to save session in localStorage:', err)
  }

  return session
}

export const authClient = {
  // Get active session
  async getSession() {
    const session = getStoredSession()
    if (!session?.user?.id) {
      return { data: { user: null }, error: null }
    }

    // Verify and refresh latest user details from Turso DB
    try {
      const res = await db.execute({
        sql: `SELECT id, name, email, image, role FROM users WHERE id = ? LIMIT 1`,
        args: [session.user.id],
      })

      if (res.rows.length > 0) {
        const u = res.rows[0]
        const refreshedUser = {
          id: u.id,
          name: u.name,
          email: u.email,
          image: u.image || null,
          role: u.role || 'admin',
        }
        saveSession(refreshedUser)
        return { data: { user: refreshedUser }, error: null }
      }
    } catch (err) {
      console.warn('Could not refresh user session from Turso, using local session:', err.message)
    }

    // Fallback to cached session if network is slow/offline
    return { data: { user: session.user }, error: null }
  },

  // Sign in against Turso DB with cryptographic verification
  signIn: {
    async email({ email, password }) {
      if (!email || !password) {
        return { data: null, error: { message: 'Email and password are required' } }
      }

      const normalizedEmail = email.trim().toLowerCase()

      try {
        const res = await db.execute({
          sql: `SELECT id, name, email, password, image, role FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1`,
          args: [normalizedEmail],
        })

        if (res.rows.length === 0) {
          return { data: null, error: { message: 'Invalid email or password' } }
        }

        const user = res.rows[0]
        const isValid = await verifyPassword(password, user.password)
        if (!isValid) {
          return { data: null, error: { message: 'Invalid email or password' } }
        }

        // Automatic upgrade: If password in DB was plain text, upgrade it to PBKDF2 hash now
        if (!user.password.includes(':')) {
          try {
            const upgradedHash = await hashPassword(password)
            await db.execute({
              sql: `UPDATE users SET password = ? WHERE id = ?`,
              args: [upgradedHash, user.id],
            })
          } catch (upgradeErr) {
            console.warn('Could not auto-upgrade password hash:', upgradeErr)
          }
        }

        const session = saveSession(user)
        return { data: session, error: null }
      } catch (err) {
        console.error('Turso Sign In Error:', err)
        return { data: null, error: { message: 'Authentication error: ' + err.message } }
      }
    },
  },

  // Create new admin user in Turso DB with irreversible password hashing
  signUp: {
    async email({ email, password, name }) {
      if (!email || !password) {
        return { data: null, error: { message: 'Email and password are required' } }
      }
      if (password.length < 4) {
        return { data: null, error: { message: 'Password must be at least 4 characters long' } }
      }

      const normalizedEmail = email.trim().toLowerCase()
      const newId = 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6)
      const userName = name?.trim() || normalizedEmail.split('@')[0]

      try {
        // Check for existing user
        const check = await db.execute({
          sql: `SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1`,
          args: [normalizedEmail],
        })

        if (check.rows.length > 0) {
          return { data: null, error: { message: 'An account with this email already exists' } }
        }

        // Hash password irreversibly
        const hashedPassword = await hashPassword(password)

        // Insert new user
        await db.execute({
          sql: `
            INSERT INTO users (id, name, email, password, role)
            VALUES (?, ?, ?, ?, 'admin')
          `,
          args: [newId, userName, normalizedEmail, hashedPassword],
        })

        const newUser = {
          id: newId,
          name: userName,
          email: normalizedEmail,
          image: null,
          role: 'admin',
        }

        saveSession(newUser)
        return { data: { user: newUser }, error: null }
      } catch (err) {
        console.error('Turso Sign Up Error:', err)
        return { data: null, error: { message: err.message || 'Failed to create account' } }
      }
    },
  },

  // Update profile details directly in Turso DB
  async updateUser(updates) {
    const session = getStoredSession()
    if (!session?.user?.id) {
      return { error: { message: 'Not authenticated' } }
    }

    const userId = session.user.id

    try {
      // If updating email, check uniqueness
      if (updates.email && updates.email.toLowerCase() !== session.user.email.toLowerCase()) {
        const dup = await db.execute({
          sql: `SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ? LIMIT 1`,
          args: [updates.email.trim().toLowerCase(), userId],
        })
        if (dup.rows.length > 0) {
          return { error: { message: 'This email is already in use by another account' } }
        }
      }

      // Update in Turso
      const res = await db.execute({
        sql: `SELECT * FROM users WHERE id = ? LIMIT 1`,
        args: [userId],
      })

      if (res.rows.length === 0) {
        return { error: { message: 'User not found in database' } }
      }

      const current = res.rows[0]
      const newName = updates.name !== undefined ? updates.name.trim() : current.name
      const newEmail = updates.email !== undefined ? updates.email.trim().toLowerCase() : current.email
      const newImage = updates.image !== undefined ? updates.image : current.image

      await db.execute({
        sql: `
          UPDATE users
          SET name = ?, email = ?, image = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        args: [newName, newEmail, newImage, userId],
      })

      const updatedUser = {
        id: userId,
        name: newName,
        email: newEmail,
        image: newImage || null,
        role: current.role || 'admin',
      }

      saveSession(updatedUser)
      return { data: { user: updatedUser }, error: null }
    } catch (err) {
      console.error('Turso Update User Error:', err)
      return { error: { message: err.message || 'Failed to update profile' } }
    }
  },

  // Change password in Turso DB with irreversible cryptographic hashing
  async changePassword({ currentPassword, newPassword }) {
    const session = getStoredSession()
    if (!session?.user?.id) {
      return { error: { message: 'Not authenticated' } }
    }

    if (!newPassword || newPassword.length < 4) {
      return { error: { message: 'New password must be at least 4 characters long' } }
    }

    const userId = session.user.id

    try {
      const res = await db.execute({
        sql: `SELECT password FROM users WHERE id = ? LIMIT 1`,
        args: [userId],
      })

      if (res.rows.length === 0) {
        return { error: { message: 'User not found' } }
      }

      const isValid = await verifyPassword(currentPassword, res.rows[0].password)
      if (!isValid) {
        return { error: { message: 'Incorrect current password' } }
      }

      // Hash new password with fresh salt
      const hashedNew = await hashPassword(newPassword)

      await db.execute({
        sql: `UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [hashedNew, userId],
      })

      return { error: null }
    } catch (err) {
      console.error('Turso Change Password Error:', err)
      return { error: { message: err.message || 'Failed to change password' } }
    }
  },

  // Sign out
  async signOut() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_SESSION_KEY)
    }
    return { error: null }
  },
}
