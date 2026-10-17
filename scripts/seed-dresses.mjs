import pg from 'pg'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { readFileSync, existsSync } from 'fs'
import path from 'path'
import { dresses } from '../../selyn-dress/src/data/dresses.js'

// Load environment variables from .env.local
const env = readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq > 0) {
    const k = t.slice(0, eq).trim()
    let v = t.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    if (!process.env[k]) process.env[k] = v
  }
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const s3Client = new S3Client({
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  region: process.env.AWS_REGION || 'ap-southeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
})

const bucket = process.env.S3_BUCKET || 'product-images'
const endpoint = (process.env.AWS_ENDPOINT_URL_S3 || '').replace(/\/$/, '')

async function uploadImageToS3(localFilePath, dressName) {
  const buffer = readFileSync(localFilePath)
  const cleanName = dressName.toLowerCase().replace(/[^a-z0-9]/g, '_')
  const ext = path.extname(localFilePath) || '.jpg'
  const key = `products/selyn_${cleanName}_${Date.now()}${ext}`

  await s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: 'image/jpeg',
  }))

  return `${endpoint}/${bucket}/${key}`
}

async function main() {
  console.log('--- Starting Selyn Dress Seeding to Neon DB & Storage ---')
  console.log(`Total dresses in selyn-dress/src/data/dresses.js: ${dresses.length}`)

  const client = await pool.connect()
  try {
    // 1. Get or create category for Selyn dresses
    let catRes = await client.query("SELECT id FROM categories WHERE store_id = 'selyn' AND slug = 'dresses';")
    let categoryId = catRes.rows[0]?.id
    if (!categoryId) {
      const insCat = await client.query(`
        INSERT INTO categories (store_id, name, slug)
        VALUES ('selyn', 'Dresses & Gowns', 'dresses')
        RETURNING id;
      `)
      categoryId = insCat.rows[0].id
    }
    console.log(`Selyn category ID: ${categoryId}`)

    // 2. Fetch existing products for selyn
    const existingRes = await client.query("SELECT id, name, image, featured FROM products WHERE store_id = 'selyn';")
    const existingByName = new Map()
    for (const row of existingRes.rows) {
      existingByName.set(row.name.toLowerCase().trim(), row)
    }
    console.log(`Found ${existingRes.rows.length} existing products in Neon DB for store 'selyn'.`)

    let uploadedCount = 0
    let createdCount = 0
    let updatedCount = 0

    for (let index = 0; index < dresses.length; index++) {
      const dress = dresses[index]
      const nameKey = dress.name.toLowerCase().trim()
      const existing = existingByName.get(nameKey)

      const localRelative = dress.image.replace(/^\//, '')
      const localPath = path.resolve('../selyn-dress/public', localRelative)

      let finalImageUrl = existing?.image

      // Determine if we need to upload
      // Upload if:
      // - Product doesn't exist yet, OR
      // - Existing product has an unsplash image instead of our Neon S3 storage
      const isNeonStorage = finalImageUrl && finalImageUrl.includes(endpoint)
      if (!isNeonStorage) {
        if (!existsSync(localPath)) {
          console.error(`Warning: Local image not found for ${dress.name} at ${localPath}`)
          continue
        }
        console.log(`[${index + 1}/${dresses.length}] Uploading image for ${dress.name}...`)
        finalImageUrl = await uploadImageToS3(localPath, dress.name)
        uploadedCount++
      } else {
        console.log(`[${index + 1}/${dresses.length}] Reusing existing S3 image for ${dress.name}`)
      }

      const attributes = {
        sizes: Array.isArray(dress.sizes) ? dress.sizes : ['M'],
      }

      if (existing) {
        // Keep user's featured setting if already set in admin, otherwise use dress.featured
        const featured = existing.featured !== undefined ? existing.featured : Boolean(dress.featured)
        await client.query(`
          UPDATE products
          SET price = $1, image = $2, images = $3, attributes = $4, category_id = $5, featured = $6, updated_at = NOW()
          WHERE id = $7;
        `, [
          dress.price,
          finalImageUrl,
          [finalImageUrl],
          JSON.stringify(attributes),
          categoryId,
          featured,
          existing.id,
        ])
        updatedCount++
      } else {
        await client.query(`
          INSERT INTO products (store_id, category_id, name, price, image, images, featured, description, attributes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
        `, [
          'selyn',
          categoryId,
          dress.name,
          dress.price,
          finalImageUrl,
          [finalImageUrl],
          Boolean(dress.featured),
          `${dress.name} gown from Selyn Dress Collection.`,
          JSON.stringify(attributes),
        ])
        createdCount++
      }
    }

    console.log('--- Seeding Completed Successfully! ---')
    console.log(`Uploaded to S3: ${uploadedCount} images`)
    console.log(`Created in DB: ${createdCount} products`)
    console.log(`Updated in DB: ${updatedCount} products`)

    // Verify count in Neon DB
    const totalCount = await client.query("SELECT COUNT(*) FROM products WHERE store_id = 'selyn';")
    console.log(`Total products for 'selyn' in Neon DB now: ${totalCount.rows[0].count}`)

  } catch (err) {
    console.error('Seeding failed with error:', err)
  } finally {
    client.release()
    await pool.end()
  }
}

main()
