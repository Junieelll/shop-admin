// Neon Serverless Driver — works from browser, edge, and serverless environments
// Uses Neon's HTTP SQL endpoint with proper CORS handling
import { neon } from '@neondatabase/serverless'

const DATABASE_URL =
  import.meta.env.VITE_DATABASE_URL ||
  'postgresql://neondb_owner:npg_LtrOiAa5XsP8@ep-young-butterfly-b3es0guf.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'

// Create a reusable SQL query function
const sql = neon(DATABASE_URL)

/**
 * Fetch products directly from Neon Database
 */
export async function fetchProductsFromDb(storeId = 'selyn') {
  try {
    const rows = await sql`
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
        COALESCE(json_agg(DISTINCT col.id) FILTER (WHERE col.id IS NOT NULL), '[]') as collection_ids,
        COALESCE(json_agg(DISTINCT jsonb_build_object('id', col.id, 'name', col.name, 'slug', col.slug)) FILTER (WHERE col.id IS NOT NULL), '[]') as collections
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_collections pc ON p.id = pc.product_id
      LEFT JOIN collections col ON pc.collection_id = col.id
      WHERE p.store_id = ${storeId}
      GROUP BY p.id, c.name
      ORDER BY p.id DESC
    `
    return { success: true, data: rows || [] }
  } catch (err) {
    console.error('Neon SQL Fetch Error:', err)
    return { success: false, error: err.message, data: [] }
  }
}

/**
 * Insert a new product into Neon Database
 */
export async function createProductInDb(product, storeId = 'selyn') {
  try {
    const name = product.name || ''
    const price = Number(product.price) || 0
    const image = product.image || ''
    const images = product.images?.length ? product.images : [product.image]
    const featured = Boolean(product.featured)
    const description = product.description || ''
    const attributes = JSON.stringify(product.attributes || {})
    const catId = product.category_id ? Number(product.category_id) : null

    const rows = await sql`
      INSERT INTO products (store_id, category_id, name, price, image, images, featured, description, attributes)
      VALUES (${storeId}, ${catId}, ${name}, ${price}, ${image}, ${images}, ${featured}, ${description}, ${attributes}::jsonb)
      RETURNING *
    `
    const newProduct = rows?.[0]

    // Link collections in junction table
    if (newProduct && Array.isArray(product.collection_ids) && product.collection_ids.length > 0) {
      for (const colId of product.collection_ids) {
        await sql`
          INSERT INTO product_collections (product_id, collection_id)
          VALUES (${newProduct.id}, ${Number(colId)})
          ON CONFLICT DO NOTHING
        `
      }
    }

    return { success: true, data: newProduct }
  } catch (err) {
    console.error('Neon SQL Create Error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Update an existing product in Neon Database
 */
export async function updateProductInDb(product, storeId = 'selyn') {
  try {
    const name = product.name || ''
    const price = Number(product.price) || 0
    const image = product.image || ''
    const images = product.images?.length ? product.images : [product.image]
    const featured = Boolean(product.featured)
    const description = product.description || ''
    const attributes = JSON.stringify(product.attributes || {})
    const catId = product.category_id ? Number(product.category_id) : null
    const productId = Number(product.id)

    const rows = await sql`
      UPDATE products
      SET name = ${name}, price = ${price}, image = ${image}, images = ${images}, featured = ${featured}, description = ${description}, attributes = ${attributes}::jsonb, category_id = ${catId}, updated_at = NOW()
      WHERE id = ${productId} AND store_id = ${storeId}
      RETURNING *
    `

    // Update collections junction
    if (Array.isArray(product.collection_ids)) {
      await sql`DELETE FROM product_collections WHERE product_id = ${productId}`
      for (const colId of product.collection_ids) {
        await sql`
          INSERT INTO product_collections (product_id, collection_id)
          VALUES (${productId}, ${Number(colId)})
          ON CONFLICT DO NOTHING
        `
      }
    }

    return { success: true, data: rows?.[0] }
  } catch (err) {
    console.error('Neon SQL Update Error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Toggle featured boolean in Neon Database
 */
export async function toggleFeaturedInDb(id, featured, storeId = 'selyn') {
  try {
    const rows = await sql`
      UPDATE products
      SET featured = ${Boolean(featured)}, updated_at = NOW()
      WHERE id = ${Number(id)} AND store_id = ${storeId}
      RETURNING id, featured
    `
    return { success: true, data: rows?.[0] }
  } catch (err) {
    console.error('Neon SQL Toggle Featured Error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Delete a product from Neon Database
 */
export async function deleteProductFromDb(id, storeId = 'selyn') {
  try {
    await sql`DELETE FROM products WHERE id = ${Number(id)} AND store_id = ${storeId}`
    return { success: true }
  } catch (err) {
    console.error('Neon SQL Delete Error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Fetch collections from Neon Database
 */
export async function fetchCollectionsFromDb(storeId = 'selyn') {
  try {
    const rows = await sql`
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
      WHERE c.store_id = ${storeId}
      GROUP BY c.id
      ORDER BY c.id ASC
    `
    return { success: true, data: rows || [] }
  } catch (err) {
    console.error('Neon SQL Collections Fetch Error:', err)
    return { success: false, error: err.message, data: [] }
  }
}

/**
 * Create a new collection in Neon Database
 */
export async function createCollectionInDb(col, storeId = 'selyn') {
  try {
    const name = col.name || ''
    const slug = col.slug || col.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const description = `Collection for ${storeId}`

    const rows = await sql`
      INSERT INTO collections (store_id, name, slug, description)
      VALUES (${storeId}, ${name}, ${slug}, ${description})
      RETURNING *
    `
    return { success: true, data: rows?.[0] }
  } catch (err) {
    console.error('Neon SQL Collection Create Error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Delete a collection from Neon Database
 */
export async function deleteCollectionFromDb(id, storeId = 'selyn') {
  try {
    await sql`DELETE FROM collections WHERE id = ${Number(id)} AND store_id = ${storeId}`
    return { success: true }
  } catch (err) {
    console.error('Neon SQL Collection Delete Error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Update an existing collection in Neon Database
 */
export async function updateCollectionInDb(col, storeId = 'selyn') {
  try {
    const name = col.name || ''
    const slug = col.slug || col.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const description = col.description || `Collection for ${storeId}`
    const bannerImage = col.banner_image || null

    const rows = await sql`
      UPDATE collections
      SET name = ${name}, slug = ${slug}, description = ${description}, banner_image = ${bannerImage}
      WHERE id = ${Number(col.id)} AND store_id = ${storeId}
      RETURNING *
    `
    return { success: true, data: rows?.[0] }
  } catch (err) {
    console.error('Neon SQL Collection Update Error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Link a product to a collection in Neon Database
 */
export async function addProductToCollectionInDb(productId, collectionId) {
  try {
    await sql`
      INSERT INTO product_collections (product_id, collection_id)
      VALUES (${Number(productId)}, ${Number(collectionId)})
      ON CONFLICT DO NOTHING
    `
    return { success: true }
  } catch (err) {
    console.error('Add product to collection error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Remove a product from a collection in Neon Database
 */
export async function removeProductFromCollectionInDb(productId, collectionId) {
  try {
    await sql`
      DELETE FROM product_collections
      WHERE product_id = ${Number(productId)} AND collection_id = ${Number(collectionId)}
    `
    return { success: true }
  } catch (err) {
    console.error('Remove product from collection error:', err)
    return { success: false, error: err.message }
  }
}

