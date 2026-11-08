// Admin-only SQL proxy. The browser sends { sql, args } and this runs it against Turso
// using the server-side token, so no database credentials ever reach the frontend.
import { createClient } from '@libsql/client'
import { requireAdmin } from './_auth.js'

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

const ALLOWED_VERBS = new Set(['SELECT', 'INSERT', 'UPDATE', 'DELETE'])
const MAX_STATEMENTS = 100
const MAX_SQL_LENGTH = 20000
const MAX_ARGS = 500

// Validates one { sql, args } statement. Throws with a safe message if it is not allowed.
function prepare(stmt) {
  if (!stmt || typeof stmt.sql !== 'string') throw new Error('Invalid statement')
  const sql = stmt.sql.trim()
  if (!sql || sql.length > MAX_SQL_LENGTH) throw new Error('Invalid statement')

  const verb = sql.split(/\s+/)[0].toUpperCase()
  if (!ALLOWED_VERBS.has(verb)) throw new Error('Statement type not allowed')

  // Account/password data is only reachable through /api/auth
  if (/\busers\b/i.test(sql)) throw new Error('Table not allowed')

  const rawArgs = Array.isArray(stmt.args) ? stmt.args : []
  if (rawArgs.length > MAX_ARGS) throw new Error('Too many arguments')
  const args = rawArgs.map((a) => {
    if (a === null || a === undefined) return null
    if (typeof a === 'boolean') return a ? 1 : 0
    if (typeof a === 'number' || typeof a === 'string') return a
    throw new Error('Unsupported argument type')
  })

  return { sql, args }
}

function serialize(rs) {
  return {
    columns: rs.columns,
    rows: rs.rows.map((row) =>
      rs.columns.map((_, i) => {
        const v = row[i]
        if (typeof v === 'bigint') return Number.isSafeInteger(Number(v)) ? Number(v) : v.toString()
        if (v instanceof ArrayBuffer) return null // blobs are not used by the admin
        return v ?? null
      })
    ),
    rowsAffected: rs.rowsAffected || 0,
    lastInsertRowid: rs.lastInsertRowid != null ? String(rs.lastInsertRowid) : null,
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (!requireAdmin(req, res)) return

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = req.body || {}

  try {
    const db = getClient()

    if (body.op === 'execute') {
      const result = await db.execute(prepare(body))
      return res.status(200).json(serialize(result))
    }

    if (body.op === 'batch') {
      if (!Array.isArray(body.statements) || body.statements.length === 0 || body.statements.length > MAX_STATEMENTS) {
        return res.status(400).json({ error: 'Invalid batch' })
      }
      const mode = ['read', 'write', 'deferred'].includes(body.mode) ? body.mode : 'write'
      const results = await db.batch(body.statements.map(prepare), mode)
      return res.status(200).json({ results: results.map(serialize) })
    }

    return res.status(400).json({ error: 'Unknown operation' })
  } catch (err) {
    const known = ['Invalid', 'not allowed', 'Too many', 'Unsupported']
    const isValidation = known.some((k) => String(err.message).includes(k))
    console.error('SQL proxy error:', err)
    return res.status(isValidation ? 400 : 500).json({ error: err.message })
  }
}