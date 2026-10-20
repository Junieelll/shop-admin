import { createClient } from '@libsql/client'

let client
function getClient() {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL
    const authToken = process.env.TURSO_AUTH_TOKEN
    if (!url || !authToken) {
      throw new Error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN environment variables')
    }
    client = createClient({ url, authToken })
  }
  return client
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const db = getClient()
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const storeId = url.searchParams.get('store') || 'selyn'

  try {
    if (req.method === 'GET') {
      const result = await db.execute({
        sql: `
          SELECT 
            c.id,
            c.store_id,
            c.name,
            c.slug,
            c.description,
            c.banner_image,
            COUNT(pc.product_id) as product_count
          FROM collections c
          LEFT JOIN product_collections pc ON c.id = pc.collection_id
          WHERE c.store_id = ?
          GROUP BY c.id
          ORDER BY c.id ASC;
        `,
        args: [storeId],
      })

      const rows = result.rows.map(r => ({
        id: Number(r.id),
        store_id: r.store_id,
        name: r.name,
        slug: r.slug,
        description: r.description,
        banner_image: r.banner_image,
        product_count: Number(r.product_count) || 0,
      }))

      return res.status(200).json(rows)
    }

    if (req.method === 'POST') {
      const { name, slug, description = '', banner_image = null } = req.body || {}
      const cleanSlug = slug || (name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : 'col-' + Date.now())

      const insertRes = await db.execute({
        sql: `
          INSERT INTO collections (store_id, name, slug, description, banner_image)
          VALUES (?, ?, ?, ?, ?)
        `,
        args: [storeId, name, cleanSlug, description, banner_image],
      })

      const newId = Number(insertRes.lastInsertRowid)

      return res.status(201).json({
        id: newId,
        store_id: storeId,
        name,
        slug: cleanSlug,
        description,
        banner_image,
      })
    }

    if (req.method === 'PUT') {
      const { id, name, slug, description = '', banner_image = null } = req.body || {}
      const cleanSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

      await db.execute({
        sql: `
          UPDATE collections
          SET name = ?, slug = ?, description = ?, banner_image = ?
          WHERE id = ? AND store_id = ?
        `,
        args: [name, cleanSlug, description, banner_image, Number(id), storeId],
      })

      return res.status(200).json({
        id: Number(id),
        store_id: storeId,
        name,
        slug: cleanSlug,
        description,
        banner_image,
      })
    }

    if (req.method === 'DELETE') {
      const colId = url.searchParams.get('id') || req.body?.id
      if (!colId) {
        return res.status(400).json({ error: 'Missing collection ID' })
      }

      await db.execute({
        sql: `DELETE FROM collections WHERE id = ? AND store_id = ?`,
        args: [Number(colId), storeId],
      })

      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Collections API Error:', err)
    return res.status(500).json({ error: err.message })
  }
}
