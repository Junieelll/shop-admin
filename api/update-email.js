import pg from 'pg'

let pool
function getPool() {
  if (!pool) {
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  }
  return pool
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { userId, newEmail } = req.body || {}

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid userId' })
  }

  if (!newEmail || typeof newEmail !== 'string' || !newEmail.includes('@')) {
    return res.status(400).json({ error: 'Missing or invalid newEmail' })
  }

  const normalizedEmail = newEmail.trim().toLowerCase()

  try {
    const db = getPool()

    // Check if email is already taken by a different user
    const existing = await db.query(
      `SELECT id FROM neon_auth."user" WHERE email = $1 AND id != $2`,
      [normalizedEmail, userId]
    )
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'This email address is already in use by another account.' })
    }

    // Update the email in neon_auth.user
    const result = await db.query(
      `UPDATE neon_auth."user"
       SET email = $1, "updatedAt" = NOW()
       WHERE id = $2
       RETURNING id, email, name, image`,
      [normalizedEmail, userId]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found.' })
    }

    return res.status(200).json({ success: true, user: result.rows[0] })
  } catch (err) {
    console.error('[update-email] DB error:', err)
    return res.status(500).json({ error: 'Database error: ' + err.message })
  }
}
