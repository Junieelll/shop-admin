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
  // Accept both GET (?userId=...) and POST ({ userId: ... })
  const userId =
    (req.method === 'GET'
      ? new URL(req.url, 'http://localhost').searchParams.get('userId')
      : req.body?.userId) || null

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'Missing userId parameter' })
  }

  try {
    const db = getPool()
    const result = await db.query(
      `SELECT id, name, email, image FROM neon_auth."user" WHERE id = $1`,
      [userId]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    return res.status(200).json({ success: true, user: result.rows[0] })
  } catch (err) {
    console.error('[user-profile] DB error:', err)
    return res.status(500).json({ error: 'Database error: ' + err.message })
  }
}
