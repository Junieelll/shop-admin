// Read-only public catalog endpoint for Luxe Haven and Selyn.
// Uses the SECRET Turso variables on the server: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN (no VITE_ prefix).
import { createClient } from '@libsql/client'

// Only these stores can be read through this endpoint.
const ALLOWED_STORES = new Set(['luxe-haven', 'selyn'])

// Websites allowed to call this endpoint from a browser. Add your real domains here.
const ALLOWED_ORIGINS = new Set([
  'https://luxehavenph.com',
  'https://www.luxehavenph.com',
  'https://selyndressrental.com',
  'https://www.selyndressrental.com',
  'http://localhost:5173',
])

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

// Each resource: a fixed SQL statement + how to build its arguments.
const QUERIES = {
  'products-meta': {
    sql: `SELECT COUNT(*) as count,
                 COALESCE(MAX(updated_at), MAX(created_at), '') as last_mod
          FROM products WHERE store_id = ?`,
    args: (store) => [store],
  },
  products: {
    sql: `SELECT p.id, p.store_id, p.category_id,
                 c.name as category_name, c.slug as category_slug,
                 p.name, p.price, p.image, p.images, p.featured,
                 p.description, p.attributes, p.created_at, p.updated_at
          FROM products p
          LEFT JOIN categories c ON p.category_id = c.id
          WHERE p.store_id = ?
          ORDER BY p.id DESC`,
    args: (store) => [store],
  },
  'product-collections': {
    sql: `SELECT pc.product_id, col.id, col.name, col.slug
          FROM product_collections pc
          JOIN collections col ON pc.collection_id = col.id
          WHERE col.store_id = ?`,
    args: (store) => [store],
  },
  'product-images': {
    sql: `SELECT image, images FROM products WHERE id = ? AND store_id = ?`,
    args: (store, id) => [id, store],
    needsId: true,
  },
  'categories-meta': {
    sql: `SELECT COUNT(*) as count,
                 COALESCE(MAX(id), 0) as max_id,
                 COALESCE(SUM(LENGTH(COALESCE(image, ''))), 0) as img_checksum
          FROM categories WHERE store_id = ?`,
    args: (store) => [store],
  },
  categories: {
    sql: `SELECT id, store_id, name, slug, image
          FROM categories WHERE store_id = ? ORDER BY id ASC`,
    args: (store) => [store],
  },
  collections: {
    sql: `SELECT c.id, c.store_id, c.name, c.slug, c.description, c.banner_image,
                 COUNT(pc.product_id) as product_count
          FROM collections c
          LEFT JOIN product_collections pc ON c.id = pc.collection_id
          WHERE c.store_id = ?
          GROUP BY c.id
          ORDER BY c.id ASC`,
    args: (store) => [store],
  },
  'collections-light': {
    sql: `SELECT id, store_id, name, slug, description, banner_image
          FROM collections WHERE store_id = ? ORDER BY id ASC`,
    args: (store) => [store],
  },
  version: {
    sql: `SELECT value FROM catalog_meta WHERE key = 'version'`,
    args: () => [],
  },
}

export default async function handler(req, res) {
  const origin = req.headers.origin
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const store = url.searchParams.get('store')
  const resource = url.searchParams.get('resource')

  if (!ALLOWED_STORES.has(store)) return res.status(400).json({ error: 'Unknown store' })
  if (!Object.hasOwn(QUERIES, resource)) return res.status(400).json({ error: 'Unknown resource' })

  const q = QUERIES[resource]
  let id = null
  if (q.needsId) {
    id = Number(url.searchParams.get('id'))
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid id' })
  }

  try {
    const result = await getClient().execute({ sql: q.sql, args: q.args(store, id) })
    const rows = result.rows.map(row =>
      Object.fromEntries(result.columns.map((col, i) => [col, row[i]]))
    )
    // Cached at Vercel's edge for a short time: protects your Turso read quota from bots.
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120')
    return res.status(200).json({ rows })
  } catch (err) {
    console.error('Catalog API error:', err)
    return res.status(500).json({ error: 'Failed to load catalog' })
  }
}