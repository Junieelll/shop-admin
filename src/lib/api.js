// Turso Serverless SQLite Driver — works in browser, edge, and Node.js
import { createClient } from '@libsql/client/web'

const TURSO_URL =
  (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_TURSO_DATABASE_URL) ||
  (typeof process !== 'undefined' && process?.env?.TURSO_DATABASE_URL) ||
  'libsql://shop-db-junieelll.aws-ap-northeast-1.turso.io'

const TURSO_TOKEN =
  (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_TURSO_AUTH_TOKEN) ||
  (typeof process !== 'undefined' && process?.env?.TURSO_AUTH_TOKEN) ||
  'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTI1MDQ3NDksImlkIjoiMDFhMTU5OTktNzYwMS03YmVkLWJlYTUtNjAwMzkyN2M5NThmIiwia2lkIjoiT3JzNGpUN05ZSVY2NXZGNnRvUVBOMWMtZnBIcENQaXpOX251VzZrNDlmNCIsInJpZCI6IjY1MjgyZTA0LWU5MDktNGI4MS1hMGIyLTJkN2Y4MGIzNzNmMiJ9.BGkxZuu-V7bib21e-uoVqfTxrn0o5TaVnCDjsTkhf7xg9OSzsd4LCPscbjoEKdnmPTradnk9eiH82AoUA9h1Cw'

export const db = createClient({
  url: TURSO_URL,
  authToken: TURSO_TOKEN,
})

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
 * Fetch products directly from Turso SQLite
 */
export async function fetchProductsFromDb(storeId = 'selyn') {
  try {
    // 1. Fetch products with category name
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

    // 2. Fetch linked collections for this store
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

    const data = productsRes.rows.map(p => normalizeProduct(p, collectionsMap))
    return { success: true, data }
  } catch (err) {
    console.error('Turso SQL Fetch Error:', err)
    return { success: false, error: err.message, data: [] }
  }
}

/**
 * Insert a new product into Turso SQLite
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

    // Link collections in junction table
    if (newId && Array.isArray(product.collection_ids) && product.collection_ids.length > 0) {
      for (const colId of product.collection_ids) {
        await db.execute({
          sql: `
            INSERT OR IGNORE INTO product_collections (product_id, collection_id)
            VALUES (?, ?)
          `,
          args: [newId, Number(colId)],
        })
      }
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

    await db.execute({
      sql: `
        UPDATE products
        SET name = ?, price = ?, image = ?, images = ?, featured = ?, description = ?, attributes = ?, category_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND store_id = ?
      `,
      args: [name, price, image, images, featured, description, attributes, catId, productId, storeId],
    })

    // Update collections junction
    if (Array.isArray(product.collection_ids)) {
      await db.execute({
        sql: `DELETE FROM product_collections WHERE product_id = ?`,
        args: [productId],
      })
      for (const colId of product.collection_ids) {
        await db.execute({
          sql: `
            INSERT OR IGNORE INTO product_collections (product_id, collection_id)
            VALUES (?, ?)
          `,
          args: [productId, Number(colId)],
        })
      }
    }

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
    await db.execute({
      sql: `DELETE FROM products WHERE id = ? AND store_id = ?`,
      args: [Number(id), storeId],
    })
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
    return { success: true }
  } catch (err) {
    console.error('Remove product from collection error:', err)
    return { success: false, error: err.message }
  }
}
