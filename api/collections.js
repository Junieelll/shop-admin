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
  const db = getPool()
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const storeId = url.searchParams.get('store') || 'selyn'

  try {
    if (req.method === 'GET') {
      const result = await db.query(`
        SELECT 
          c.id,
          c.store_id,
          c.name,
          c.slug,
          c.description,
          c.banner_image,
          COUNT(pc.product_id)::int as product_count
        FROM collections c
        LEFT JOIN product_collections pc ON c.id = pc.collection_id
        WHERE c.store_id = $1
        GROUP BY c.id
        ORDER BY c.id ASC;
      `, [storeId])

      return res.status(200).json(result.rows)
    }

    if (req.method === 'POST') {
      const { name, slug, description = '', banner_image = null } = req.body
      const cleanSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

      const insertRes = await db.query(`
        INSERT INTO collections (store_id, name, slug, description, banner_image)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `, [storeId, name, cleanSlug, description, banner_image])

      return res.status(201).json(insertRes.rows[0])
    }

    if (req.method === 'DELETE') {
      const id = url.searchParams.get('id') || req.body?.id
      if (!id) return res.status(400).json({ error: 'Missing collection id' })

      await db.query('DELETE FROM collections WHERE id = $1 AND store_id = $2;', [id, storeId])
      return res.status(200).json({ success: true, id })
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  } catch (error) {
    console.error('API /collections error:', error)
    res.status(500).json({ error: error.message })
  }
}
