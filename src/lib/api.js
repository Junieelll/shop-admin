// Turso Serverless SQLite Driver — works in browser, edge, and Node.js
import { createClient } from '@libsql/client/web'

const TURSO_URL = import.meta.env.VITE_TURSO_DATABASE_URL || ''
const TURSO_TOKEN = import.meta.env.VITE_TURSO_AUTH_TOKEN || ''

export const db = TURSO_URL
  ? createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })
  : null

/**
 * Check if a URL belongs to our S3/Neon object storage bucket
 * (skip external URLs, base64 data URIs, and relative paths)
 */
function isS3Url(url) {
  if (!url || typeof url !== 'string') return false
  if (url.startsWith('data:')) return false
  if (url.startsWith('/')) return false
  try {
    const endpoint = (import.meta.env.VITE_AWS_ENDPOINT_URL_S3 || '').replace(/\/$/, '')
    if (endpoint && url.startsWith(endpoint)) return true
    if (url.includes('.storage.') && url.includes('neon.tech')) return true
  } catch {
    // ignore
  }
  return false
}

/**
 * Delete images from S3/Neon object storage bucket.
 * Filters to only delete URLs that belong to our storage bucket.
 * Safe to call with any mix of S3 URLs, external URLs, or base64 — non-S3 are skipped.
 */
export async function deleteImagesFromStorage(imageUrls = []) {
  const s3Urls = imageUrls.filter(isS3Url)
  if (s3Urls.length === 0) return { success: true, deleted: 0 }

  try {
    const res = await fetch('/api/delete-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: s3Urls }),
    })
    if (res.ok) {
      const data = await res.json()
      return { success: true, deleted: data.deleted || 0 }
    }
    const err = await res.json().catch(() => ({}))
    console.warn('S3 delete warning:', err)
    return { success: false, error: err.error || 'Delete failed' }
  } catch (err) {
    console.error('S3 delete error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Alias used by collection functions to signal catalog changes
 */
async function touchCatalogVersion() {
  notifyCatalogUpdated()
}

/**
 * Helper to normalize SQLite rows into clean frontend product models
 */
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

  return {
    id: Number(p.id),
    store_id: p.store_id,
    category_id: p.category_id ? Number(p.category_id) : null,
    category_name: p.category_name || null,
    category_slug: p.category_slug || null,
    name: p.name || '',
    price: Number(p.price) || 0,
    image: p.image || '',
    images: Array.isArray(images) && images.length ? images : (p.image ? [p.image] : []),
    featured: Boolean(p.featured),
    description: p.description || '',
    attributes,
    created_at: p.created_at,
    collection_ids: linkedCollections.map(c => Number(c.id)),
    collections: linkedCollections,
  }
}

/**
 * Broadcast an instant sync event to any open storefront tabs
 */
export function notifyCatalogUpdated(storeId = 'luxe-haven') {
  try {
    const timestamp = Date.now().toString()
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`catalog_updated_${storeId}`, timestamp)
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel(`shop_catalog_sync_${storeId}`)
        bc.postMessage({ storeId, timestamp })
        bc.close()
      }
    }
  } catch (e) {
    console.warn('Sync broadcast warning:', e)
  }
}

/**
 * Fetch categories for a specific store from Turso SQLite
 */
export async function fetchCategoriesFromDb(storeId = 'luxe-haven') {
  try {
    const res = await db.execute({
      sql: `SELECT id, store_id, name, slug FROM categories WHERE store_id = ? ORDER BY id ASC`,
      args: [storeId],
    })
    return { success: true, data: res.rows }
  } catch (err) {
    console.error('Turso SQL Categories Fetch Error:', err)
    return { success: false, error: err.message, data: [] }
  }
}

/**
 * Fetch products directly from Turso SQLite
 * OPTIMIZED: Skips collection queries for stores without collections (e.g. luxe-haven)
 */
export async function fetchProductsFromDb(storeId = 'selyn') {
  try {
    if (storeId === 'luxe-haven') {
      const productsRes = await db.execute({
        sql: `
          SELECT 
            p.id,
            p.store_id,
            p.category_id,
            c.name as category_name,
            c.slug as category_slug,
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

      const data = productsRes.rows.map(p => normalizeProduct(p))
      return { success: true, data }
    }

    const [productsRes, pcRes] = await Promise.all([
      db.execute({
        sql: `
          SELECT 
            p.id,
            p.store_id,
            p.category_id,
            c.name as category_name,
            c.slug as category_slug,
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
      }),
      db.execute({
        sql: `
          SELECT pc.product_id, col.id, col.name, col.slug
          FROM product_collections pc
          JOIN collections col ON pc.collection_id = col.id
          WHERE col.store_id = ?
        `,
        args: [storeId],
      }),
    ])

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

    const data = productsRes.rows.map(p => normalizeProduct(p, collectionsMap))
    return { success: true, data }
  } catch (err) {
    console.error('Turso SQL Fetch Error:', err)
    return { success: false, error: err.message, data: [] }
  }
}

/**
 * Load the full photo gallery for ONE product (used by the edit modal)
 */
export async function fetchProductImagesFromDb(id, storeId = 'selyn') {
  try {
    const res = await db.execute({
      sql: `SELECT image, images FROM products WHERE id = ? AND store_id = ?`,
      args: [Number(id), storeId],
    })
    const row = res.rows[0]
    let images = []
    try {
      images = typeof row?.images === 'string' ? JSON.parse(row.images) : (row?.images || [])
    } catch {
      images = row?.image ? [row.image] : []
    }
    return { success: true, data: { images: images.length ? images : (row?.image ? [row.image] : []) } }
  } catch (err) {
    console.error('Turso SQL Images Fetch Error:', err)
    return { success: false, error: err.message, data: { images: [] } }
  }
}

/**
 * Insert a new product into Turso SQLite
 * OPTIMIZED: Bundles junction links in batch
 */
export async function createProductInDb(product, storeId = 'selyn') {
  try {
    const name = product.name || ''
    const price = Number(product.price) || 0
    const image = product.image || ''
    const images = JSON.stringify(product.images?.length ? product.images : [image])
    const featured = product.featured ? 1 : 0
    const description = product.description || ''
    const attributes = JSON.stringify(product.attributes || {})
    const catId = product.category_id ? Number(product.category_id) : null

    const result = await db.execute({
      sql: `
        INSERT INTO products (store_id, category_id, name, price, image, images, featured, description, attributes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [storeId, catId, name, price, image, images, featured, description, attributes],
    })

    const newId = Number(result.lastInsertRowid)

    // Link collections in a single batch request
    if (newId && Array.isArray(product.collection_ids) && product.collection_ids.length > 0) {
      const linkStatements = product.collection_ids.map(colId => ({
        sql: `INSERT OR IGNORE INTO product_collections (product_id, collection_id) VALUES (?, ?)`,
        args: [newId, Number(colId)],
      }))
      await db.batch(linkStatements, 'write')
    }

    // Fetch back the created product
    const fetchRes = await db.execute({
      sql: `
        SELECT p.*, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = ?
      `,
      args: [newId],
    })

    const created = fetchRes.rows[0] ? normalizeProduct(fetchRes.rows[0]) : { id: newId, name, price, image }
    return { success: true, data: created }
  } catch (err) {
    console.error('Turso SQL Create Error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Update an existing product in Turso SQLite
 * OPTIMIZED: Executes update + collection junction sync in a single atomic batch transaction
 */
export async function updateProductInDb(product, storeId = 'selyn') {
  try {
    const name = product.name || ''
    const price = Number(product.price) || 0
    const image = product.image || ''
    const images = JSON.stringify(product.images?.length ? product.images : [image])
    const featured = product.featured ? 1 : 0
    const description = product.description || ''
    const attributes = JSON.stringify(product.attributes || {})
    const catId = product.category_id ? Number(product.category_id) : null
    const productId = Number(product.id)

    // Build atomic transaction batch
    const statements = [
      {
        sql: `
          UPDATE products
          SET name = ?, price = ?, image = ?, images = ?, featured = ?, description = ?, attributes = ?, category_id = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND store_id = ?
        `,
        args: [name, price, image, images, featured, description, attributes, catId, productId, storeId],
      },
    ]

    // Sync collections inside same transaction
    if (Array.isArray(product.collection_ids)) {
      statements.push({
        sql: `DELETE FROM product_collections WHERE product_id = ?`,
        args: [productId],
      })
      for (const colId of product.collection_ids) {
        statements.push({
          sql: `INSERT OR IGNORE INTO product_collections (product_id, collection_id) VALUES (?, ?)`,
          args: [productId, Number(colId)],
        })
      }
    }

    // Execute atomic batch
    await db.batch(statements, 'write')

    const fetchRes = await db.execute({
      sql: `
        SELECT p.*, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = ?
      `,
      args: [productId],
    })

    const updated = fetchRes.rows[0] ? normalizeProduct(fetchRes.rows[0]) : product
    return { success: true, data: updated }
  } catch (err) {
    console.error('Turso SQL Update Error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Toggle featured boolean in Turso SQLite
 */
export async function toggleFeaturedInDb(id, featured, storeId = 'selyn') {
  try {
    const val = featured ? 1 : 0
    await db.execute({
      sql: `
        UPDATE products
        SET featured = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND store_id = ?
      `,
      args: [val, Number(id), storeId],
    })
    return { success: true, data: { id: Number(id), featured: Boolean(featured) } }
  } catch (err) {
    console.error('Turso SQL Toggle Featured Error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Delete a product from Turso SQLite
 */
export async function deleteProductFromDb(id, storeId = 'selyn') {
  try {
    // 1) Fetch the product's images before deleting
    const imgRes = await db.execute({
      sql: `SELECT image, images FROM products WHERE id = ? AND store_id = ?`,
      args: [Number(id), storeId],
    })

    // 2) Delete the product from the database
    await db.execute({
      sql: `DELETE FROM products WHERE id = ? AND store_id = ?`,
      args: [Number(id), storeId],
    })

    // 3) Clean up S3 images in the background (don't block the response)
    const row = imgRes.rows[0]
    if (row) {
      let allImages = []
      try {
        const parsed = typeof row.images === 'string' ? JSON.parse(row.images) : (row.images || [])
        allImages = Array.isArray(parsed) ? parsed : []
      } catch {
        allImages = []
      }
      if (row.image && !allImages.includes(row.image)) {
        allImages.push(row.image)
      }
      if (allImages.length > 0) {
        deleteImagesFromStorage(allImages).catch(err =>
          console.warn('Background S3 cleanup warning:', err)
        )
      }
    }

    return { success: true }
  } catch (err) {
    console.error('Turso SQL Delete Error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Fetch collections from Turso SQLite
 */
export async function fetchCollectionsFromDb(storeId = 'selyn') {
  try {
    const res = await db.execute({
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
        ORDER BY c.id ASC
      `,
      args: [storeId],
    })

    const rows = res.rows.map(r => ({
      id: Number(r.id),
      store_id: r.store_id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      banner_image: r.banner_image,
      product_count: Number(r.product_count) || 0,
    }))

    return { success: true, data: rows }
  } catch (err) {
    console.error('Turso SQL Collections Fetch Error:', err)
    return { success: false, error: err.message, data: [] }
  }
}

/**
 * Create a new collection in Turso SQLite
 */
export async function createCollectionInDb(col, storeId = 'selyn') {
  try {
    const name = col.name || ''
    const slug = col.slug || col.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const description = col.description || `Collection for ${storeId}`
    const bannerImage = col.banner_image || null

    const res = await db.execute({
      sql: `
        INSERT INTO collections (store_id, name, slug, description, banner_image)
        VALUES (?, ?, ?, ?, ?)
      `,
      args: [storeId, name, slug, description, bannerImage],
    })

    const newId = Number(res.lastInsertRowid)
    await touchCatalogVersion()
    return {
      success: true,
      data: {
        id: newId,
        store_id: storeId,
        name,
        slug,
        description,
        banner_image: bannerImage,
        product_count: 0,
      },
    }
  } catch (err) {
    console.error('Turso SQL Collection Create Error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Delete a collection from Turso SQLite
 */
export async function deleteCollectionFromDb(id, storeId = 'selyn') {
  try {
    await db.execute({
      sql: `DELETE FROM collections WHERE id = ? AND store_id = ?`,
      args: [Number(id), storeId],
    })
    await touchCatalogVersion()
    return { success: true }
  } catch (err) {
    console.error('Turso SQL Collection Delete Error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Update an existing collection in Turso SQLite
 */
export async function updateCollectionInDb(col, storeId = 'selyn') {
  try {
    const name = col.name || ''
    const slug = col.slug || col.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const description = col.description || `Collection for ${storeId}`
    const bannerImage = col.banner_image || null
    const id = Number(col.id)

    await db.execute({
      sql: `
        UPDATE collections
        SET name = ?, slug = ?, description = ?, banner_image = ?
        WHERE id = ? AND store_id = ?
      `,
      args: [name, slug, description, bannerImage, id, storeId],
    })
    await touchCatalogVersion()

    return {
      success: true,
      data: {
        id,
        store_id: storeId,
        name,
        slug,
        description,
        banner_image: bannerImage,
      },
    }
  } catch (err) {
    console.error('Turso SQL Collection Update Error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Link a product to a collection in Turso SQLite
 */
export async function addProductToCollectionInDb(productId, collectionId) {
  try {
    await db.execute({
      sql: `
        INSERT OR IGNORE INTO product_collections (product_id, collection_id)
        VALUES (?, ?)
      `,
      args: [Number(productId), Number(collectionId)],
    })
    await touchCatalogVersion()
    return { success: true }
  } catch (err) {
    console.error('Add product to collection error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Remove a product from a collection in Turso SQLite
 */
export async function removeProductFromCollectionInDb(productId, collectionId) {
  try {
    await db.execute({
      sql: `
        DELETE FROM product_collections
        WHERE product_id = ? AND collection_id = ?
      `,
      args: [Number(productId), Number(collectionId)],
    })
    await touchCatalogVersion()
    return { success: true }
  } catch (err) {
    console.error('Remove product from collection error:', err)
    return { success: false, error: err.message }
  }
}

// ───────────────────────────────────────────────────────────────
// Cheap, targeted queries (keep Turso "rows read" low)
// Recommended indexes (run once in Turso):
//   CREATE INDEX IF NOT EXISTS idx_pc_collection ON product_collections(collection_id, product_id);
//   CREATE INDEX IF NOT EXISTS idx_pc_product ON product_collections(product_id, collection_id);
//   CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);
//   CREATE INDEX IF NOT EXISTS idx_products_store_featured ON products(store_id, featured);
//   CREATE INDEX IF NOT EXISTS idx_collections_store ON collections(store_id);
// ───────────────────────────────────────────────────────────────

/**
 * Collections without the COUNT/JOIN (the list is small, no need to scan the junction table)
 */
export async function fetchCollectionsLightFromDb(storeId = 'selyn') {
  try {
    const res = await db.execute({
      sql: `SELECT id, store_id, name, slug, description, banner_image
            FROM collections WHERE store_id = ? ORDER BY id ASC`,
      args: [storeId],
    })
    const data = res.rows.map(r => ({
      id: Number(r.id),
      store_id: r.store_id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      banner_image: r.banner_image,
    }))
    return { success: true, data }
  } catch (err) {
    console.error('Collections light fetch error:', err)
    return { success: false, error: err.message, data: [] }
  }
}

/**
 * Only the products linked to ONE collection. No `images` column (loaded on edit).
 */
export async function fetchCollectionProductsFromDb(collectionId, storeId = 'selyn') {
  try {
    const res = await db.execute({
      sql: `
        SELECT p.id, p.store_id, p.category_id, c.name AS category_name,
               p.name, p.price, p.image, p.featured, p.description,
               p.attributes, p.created_at
        FROM product_collections pc
        JOIN products p ON p.id = pc.product_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE pc.collection_id = ? AND p.store_id = ?
        ORDER BY p.id DESC
      `,
      args: [Number(collectionId), storeId],
    })
    return { success: true, data: res.rows.map(r => normalizeProduct(r)) }
  } catch (err) {
    console.error('Collection products fetch error:', err)
    return { success: false, error: err.message, data: [] }
  }
}

/**
 * Paginated picker query: products NOT yet in the collection.
 * Keyset pagination (id < beforeId) so page N never re-reads pages 1..N-1.
 */
export async function fetchLinkableProductsFromDb({
  storeId = 'selyn',
  collectionId,
  search = '',
  beforeId = null,
  limit = 20,
}) {
  try {
    const conds = [
      'p.store_id = ?',
      `NOT EXISTS (
         SELECT 1 FROM product_collections pc
         WHERE pc.product_id = p.id AND pc.collection_id = ?
       )`,
    ]
    const args = [storeId, Number(collectionId)]

    const q = search.trim()
    if (q) {
      conds.push(`p.name LIKE ? ESCAPE '\\'`)
      args.push(`%${q.replace(/[\\%_]/g, m => '\\' + m)}%`)
    }
    if (beforeId != null) {
      conds.push('p.id < ?')
      args.push(Number(beforeId))
    }
    args.push(limit + 1) // one extra row tells us if there's another page

    const res = await db.execute({
      sql: `
        SELECT p.id, p.name, p.price, p.image
        FROM products p
        WHERE ${conds.join(' AND ')}
        ORDER BY p.id DESC
        LIMIT ?
      `,
      args,
    })

    const rows = res.rows.map(r => ({
      id: Number(r.id),
      name: r.name,
      price: Number(r.price) || 0,
      image: r.image || '',
    }))
    return { success: true, data: rows.slice(0, limit), hasMore: rows.length > limit }
  } catch (err) {
    console.error('Linkable products fetch error:', err)
    return { success: false, error: err.message, data: [], hasMore: false }
  }
}

/**
 * One full product row (used after linking, so we don't refetch the collection)
 */
export async function fetchProductByIdFromDb(id, storeId = 'selyn') {
  try {
    const res = await db.execute({
      sql: `
        SELECT p.*, c.name AS category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = ? AND p.store_id = ?
      `,
      args: [Number(id), storeId],
    })
    const row = res.rows[0]
    return { success: true, data: row ? normalizeProduct(row) : null }
  } catch (err) {
    console.error('Product by id fetch error:', err)
    return { success: false, error: err.message, data: null }
  }
}

/**
 * Gallery + collection ids for ONE product (loaded only when the edit modal opens)
 */
export async function fetchProductEditDataFromDb(id, storeId = 'selyn') {
  try {
    const [imgRes, colRes] = await db.batch([
      { sql: `SELECT image, images FROM products WHERE id = ? AND store_id = ?`, args: [Number(id), storeId] },
      { sql: `SELECT collection_id FROM product_collections WHERE product_id = ?`, args: [Number(id)] },
    ], 'read')

    const row = imgRes.rows[0]
    let images = []
    try {
      images = typeof row?.images === 'string' ? JSON.parse(row.images) : (row?.images || [])
    } catch {
      images = []
    }
    if (!images.length && row?.image) images = [row.image]

    return {
      success: true,
      data: { images, collection_ids: colRes.rows.map(r => Number(r.collection_id)) },
    }
  } catch (err) {
    console.error('Product edit data fetch error:', err)
    return { success: false, error: err.message, data: null }
  }
}

/**
 * Store counts for the sidebar + featured limit. Cached for 5 minutes.
 */
const countsCache = new Map()
export async function fetchStoreCountsFromDb(storeId = 'selyn') {
  const hit = countsCache.get(storeId)
  if (hit && Date.now() - hit.t < 5 * 60 * 1000) return { success: true, data: hit.v }
  try {
    const res = await db.execute({
      sql: `SELECT
              (SELECT COUNT(*) FROM products WHERE store_id = ?) AS products,
              (SELECT COUNT(*) FROM products WHERE store_id = ? AND featured = 1) AS featured`,
      args: [storeId, storeId],
    })
    const v = {
      products: Number(res.rows[0].products) || 0,
      featured: Number(res.rows[0].featured) || 0,
    }
    countsCache.set(storeId, { t: Date.now(), v })
    return { success: true, data: v }
  } catch (err) {
    console.error('Store counts fetch error:', err)
    return { success: false, error: err.message, data: { products: 0, featured: 0 } }
  }
}

export function invalidateStoreCounts(storeId) {
  countsCache.delete(storeId)
}