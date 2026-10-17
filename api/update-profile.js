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

  const { userId, name, image } = req.body || {}

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid userId' })
  }

  try {
    const db = getPool()

    const result = await db.query(
      `UPDATE neon_auth."user"
       SET name = COALESCE($1, name),
           image = $2,
           "updatedAt" = NOW()
       WHERE id = $3
       RETURNING id, email, name, image`,
      [name || null, image || null, userId]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found in neon_auth."user"' })
    }

    return res.status(200).json({ success: true, user: result.rows[0] })
  } catch (err) {
    console.error('[update-profile] DB error:', err)
    return res.status(500).json({ error: 'Database error: ' + err.message })
  }
}
