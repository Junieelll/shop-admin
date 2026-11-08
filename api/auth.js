import { createClient } from '@libsql/client'
import {
  hashPassword,
  verifyPassword,
  isLegacyHash,
  readSession,
  setSessionCookie,
  clearSessionCookie,
} from './_auth.js'

let client
function getClient() {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL
    const authToken = process.env.TURSO_AUTH_TOKEN
    if (!url || !authToken) throw new Error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN')
    client = createClient({ url, authToken })
  }
  return client
}

function toUser(r) {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    image: r.image || null,
    role: r.role || 'admin',
  }
}

// Best-effort brute-force guard (in-memory, so it resets on cold starts).
const failures = new Map()
const WINDOW_MS = 15 * 60 * 1000
const MAX_FAILURES = 5
function recent(key) {
  const now = Date.now()
  const list = (failures.get(key) || []).filter((t) => now - t < WINDOW_MS)
  failures.set(key, list)
  return list
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const action = url.searchParams.get('action')
  const db = getClient()

  try {
    // ---- current session ----------------------------------------------------
    if (action === 'me' && req.method === 'GET') {
      const session = readSession(req)
      if (!session) return res.status(200).json({ user: null })

      const result = await db.execute({
        sql: `SELECT id, name, email, image, role FROM users WHERE id = ? LIMIT 1`,
        args: [session.uid],
      })
      if (result.rows.length === 0) {
        clearSessionCookie(res)
        return res.status(200).json({ user: null })
      }
      return res.status(200).json({ user: toUser(result.rows[0]) })
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    const body = req.body || {}

    // ---- login --------------------------------------------------------------
    if (action === 'login') {
      const email = String(body.email || '').trim().toLowerCase()
      const password = String(body.password || '')
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' })
      }

      const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'local'
      const key = `${ip}|${email}`
      if (recent(key).length >= MAX_FAILURES) {
        return res.status(429).json({ error: 'Too many attempts. Try again in a few minutes.' })
      }

      const result = await db.execute({
        sql: `SELECT id, name, email, password, image, role FROM users WHERE LOWER(email) = ? LIMIT 1`,
        args: [email],
      })
      const row = result.rows[0]
      const ok = row ? await verifyPassword(password, row.password) : false
      if (!ok) {
        failures.set(key, [...recent(key), Date.now()])
        return res.status(401).json({ error: 'Invalid email or password' })
      }
      failures.delete(key)

      // Upgrade old plain-text passwords to PBKDF2 on first successful login
      if (isLegacyHash(row.password)) {
        await db.execute({
          sql: `UPDATE users SET password = ? WHERE id = ?`,
          args: [await hashPassword(password), row.id],
        })
      }

      const user = toUser(row)
      setSessionCookie(res, user)
      return res.status(200).json({ user })
    }

    // ---- logout -------------------------------------------------------------
    if (action === 'logout') {
      clearSessionCookie(res)
      return res.status(200).json({ success: true })
    }

    // Everything below needs a valid session
    const session = readSession(req)
    if (!session) return res.status(401).json({ error: 'Not authenticated' })
    const userId = session.uid

    // ---- update profile (name, email, image) --------------------------------
    if (action === 'update-profile') {
      const current = await db.execute({
        sql: `SELECT id, name, email, image, role FROM users WHERE id = ? LIMIT 1`,
        args: [userId],
      })
      if (current.rows.length === 0) return res.status(404).json({ error: 'User not found' })
      const cur = current.rows[0]

      const name = body.name !== undefined ? String(body.name).trim() : cur.name
      const email = body.email !== undefined ? String(body.email).trim().toLowerCase() : cur.email
      const image = body.image !== undefined ? body.image || null : cur.image

      if (!name) return res.status(400).json({ error: 'Name cannot be empty' })
      if (!email || !email.includes('@')) return res.status(400).json({ error: 'Invalid email' })

      if (email !== String(cur.email).toLowerCase()) {
        const dup = await db.execute({
          sql: `SELECT id FROM users WHERE LOWER(email) = ? AND id != ? LIMIT 1`,
          args: [email, userId],
        })
        if (dup.rows.length > 0) {
          return res.status(409).json({ error: 'This email is already in use by another account' })
        }
      }

      await db.execute({
        sql: `UPDATE users SET name = ?, email = ?, image = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [name, email, image, userId],
      })
      return res.status(200).json({ user: toUser({ ...cur, name, email, image }) })
    }

    // ---- change password ----------------------------------------------------
    if (action === 'change-password') {
      const { currentPassword, newPassword } = body
      if (!newPassword || String(newPassword).length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters long' })
      }

      const result = await db.execute({
        sql: `SELECT password FROM users WHERE id = ? LIMIT 1`,
        args: [userId],
      })
      if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' })

      if (!(await verifyPassword(String(currentPassword || ''), result.rows[0].password))) {
        return res.status(400).json({ error: 'Incorrect current password' })
      }

      await db.execute({
        sql: `UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [await hashPassword(String(newPassword)), userId],
      })
      return res.status(200).json({ success: true })
    }

    return res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    console.error('Auth API error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}