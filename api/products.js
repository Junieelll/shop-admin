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

function normalizeProduct(p, collectionsMap = {}) {
  let images = []
  try {
    images = typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || [])
  } catch {
    images = p.images ? [p.images] : []
  }

  let attributes = {}
  try {
    attributes = typeof p.attributes === 'string' ? JSON.parse(p.attributes) : (p.attributes || {})
  } catch {
    attributes = {}
  }

  const linkedCollections = collectionsMap[p.id] || []
  const hasQuantity = typeof attributes.quantity === 'number' ||
    (typeof attributes.quantity === 'string' && attributes.quantity.trim() !== '')
  const parsedQuantity = hasQuantity ? Number(attributes.quantity) : NaN
  const quantity = !hasQuantity ||
    !Number.isInteger(parsedQuantity) || parsedQuantity < 0
    ? null
    : parsedQuantity

  return {
    id: Number(p.id),
    store_id: p.store_id,
    category_id: p.category_id ? Number(p.category_id) : null,
    category_name: p.category_name || null,
    name: p.name || '',
    price: Number(p.price) || 0,
    image: p.image || '',
    images: Array.isArray(images) && images.length ? images : (p.image ? [p.image] : []),
    featured: Boolean(p.featured),
    description: p.description || '',
    attributes,
    quantity,
    is_sold_out: quantity === 0,
    created_at: p.created_at,
    collection_ids: linkedCollections.map(c => Number(c.id)),
    collections: linkedCollections,
  }
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const db = getClient()
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const storeId = url.searchParams.get('store') || 'selyn'
  const productId = url.searchParams.get('id')

  try {
    if (req.method === 'GET') {
      const productsRes = await db.execute({
        sql: `
          SELECT 
            p.id,
            p.store_id,
            p.category_id,
            c.name as category_name,
            p.name,
            p.price,
            p.image,
            p.images,
            p.featured,
            p.description,
            p.attributes,
            p.created_at
          FROM products p
          LEFT JOIN categories c ON p.category_id = c.id
          WHERE p.store_id = ?
          ORDER BY p.id DESC
        `,
        args: [storeId],
      })

      const pcRes = await db.execute({
        sql: `
          SELECT pc.product_id, col.id, col.name, col.slug
          FROM product_collections pc
          JOIN collections col ON pc.collection_id = col.id
          WHERE col.store_id = ?
        `,
        args: [storeId],
      })

      const collectionsMap = {}
      for (const row of pcRes.rows) {
        const pid = row.product_id
        if (!collectionsMap[pid]) collectionsMap[pid] = []
        collectionsMap[pid].push({
          id: Number(row.id),
          name: row.name,
          slug: row.slug,
        })
      }

      const rows = productsRes.rows.map(p => normalizeProduct(p, collectionsMap))
      return res.status(200).json(rows)
    }

    if (req.method === 'POST') {
      const {
        name,
        price,
        image,
        images = [],
        category_id = null,
        featured = false,
        description = '',
        attributes = {},
        collection_ids = [],
      } = req.body

      const imagesJson = JSON.stringify(images?.length ? images : [image])
      const attributesJson = JSON.stringify(attributes || {})
      const featuredInt = featured ? 1 : 0

      const result = await db.execute({
        sql: `
          INSERT INTO products (store_id, category_id, name, price, image, images, featured, description, attributes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [storeId, category_id ? Number(category_id) : null, name, Number(price), image, imagesJson, featuredInt, description, attributesJson],
      })

      const newId = Number(result.lastInsertRowid)

      if (Array.isArray(collection_ids) && collection_ids.length > 0) {
        for (const colId of collection_ids) {
          await db.execute({
            sql: `INSERT OR IGNORE INTO product_collections (product_id, collection_id) VALUES (?, ?)`,
            args: [newId, Number(colId)],
          })
        }
      }

      return res.status(201).json({ id: newId, store_id: storeId, name, price, image })
    }

    if (req.method === 'PUT') {
      const {
        id,
        name,
        price,
        image,
        images = [],
        category_id = null,
        featured = false,
        description = '',
        attributes = {},
        collection_ids = [],
      } = req.body

      const targetId = Number(id || productId)
      const imagesJson = JSON.stringify(images?.length ? images : [image])
      const attributesJson = JSON.stringify(attributes || {})
      const featuredInt = featured ? 1 : 0

      await db.execute({
        sql: `
          UPDATE products
          SET name = ?, price = ?, image = ?, images = ?, featured = ?, description = ?, attributes = ?, category_id = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND store_id = ?
        `,
        args: [name, Number(price), image, imagesJson, featuredInt, description, attributesJson, category_id ? Number(category_id) : null, targetId, storeId],
      })

      if (Array.isArray(collection_ids)) {
        await db.execute({
          sql: `DELETE FROM product_collections WHERE product_id = ?`,
          args: [targetId],
        })
        for (const colId of collection_ids) {
          await db.execute({
            sql: `INSERT OR IGNORE INTO product_collections (product_id, collection_id) VALUES (?, ?)`,
            args: [targetId, Number(colId)],
          })
        }
      }

      return res.status(200).json({ success: true, id: targetId })
    }

    if (req.method === 'DELETE') {
      const targetId = Number(productId || req.body?.id)
      if (!targetId) {
        return res.status(400).json({ error: 'Missing product ID' })
      }

      await db.execute({
        sql: `DELETE FROM products WHERE id = ? AND store_id = ?`,
        args: [targetId, storeId],
      })

      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Products API Error:', err)
    return res.status(500).json({ error: err.message })
  }
}
