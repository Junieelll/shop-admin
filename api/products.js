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
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const db = getPool()
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const storeId = url.searchParams.get('store') || 'selyn'
  const productId = url.searchParams.get('id')

  try {
    if (req.method === 'GET') {
      const result = await db.query(`
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
          p.created_at,
          COALESCE(
            json_agg(DISTINCT col.id) FILTER (WHERE col.id IS NOT NULL),
            '[]'
          ) as collection_ids,
          COALESCE(
            json_agg(DISTINCT jsonb_build_object('id', col.id, 'name', col.name, 'slug', col.slug)) FILTER (WHERE col.id IS NOT NULL),
            '[]'
          ) as collections
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN product_collections pc ON p.id = pc.product_id
        LEFT JOIN collections col ON pc.collection_id = col.id
        WHERE p.store_id = $1
        GROUP BY p.id, c.name
        ORDER BY p.id DESC;
      `, [storeId])

      return res.status(200).json(result.rows)
    }

    if (req.method === 'POST') {
      const { name, price, image, images = [], featured = false, description = '', attributes = {}, category_id = null, collection_ids = [] } = req.body

      const insertRes = await db.query(`
        INSERT INTO products (store_id, category_id, name, price, image, images, featured, description, attributes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *;
      `, [storeId, category_id, name, price, image, images, featured, description, JSON.stringify(attributes)])

      const newProduct = insertRes.rows[0]

      if (Array.isArray(collection_ids) && collection_ids.length > 0) {
        for (const colId of collection_ids) {
          await db.query(`
            INSERT INTO product_collections (product_id, collection_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING;
          `, [newProduct.id, colId])
        }
      }

      return res.status(201).json(newProduct)
    }

    if (req.method === 'PUT') {
      const { id, name, price, image, images = [], featured = false, description = '', attributes = {}, category_id = null, collection_ids = [] } = req.body

      const updateRes = await db.query(`
        UPDATE products
        SET name = $1, price = $2, image = $3, images = $4, featured = $5, description = $6, attributes = $7, category_id = $8, updated_at = NOW()
        WHERE id = $9 AND store_id = $10
        RETURNING *;
      `, [name, price, image, images, featured, description, JSON.stringify(attributes), category_id, id, storeId])

      if (Array.isArray(collection_ids)) {
        await db.query('DELETE FROM product_collections WHERE product_id = $1;', [id])
        for (const colId of collection_ids) {
          await db.query(`
            INSERT INTO product_collections (product_id, collection_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING;
          `, [id, colId])
        }
      }

      return res.status(200).json(updateRes.rows[0])
    }

    if (req.method === 'PATCH') {
      // Quick toggle for featured
      const { id, featured } = req.body
      const toggleRes = await db.query(`
        UPDATE products
        SET featured = $1, updated_at = NOW()
        WHERE id = $2 AND store_id = $3
        RETURNING id, featured;
      `, [featured, id, storeId])

      return res.status(200).json(toggleRes.rows[0])
    }

    if (req.method === 'DELETE') {
      const idToDelete = productId || req.body?.id
      if (!idToDelete) return res.status(400).json({ error: 'Missing product ID' })

      await db.query('DELETE FROM products WHERE id = $1 AND store_id = $2;', [idToDelete, storeId])
      return res.status(200).json({ success: true, id: idToDelete })
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  } catch (error) {
    console.error('API /products error:', error)
    res.status(500).json({ error: error.message })
  }
}
