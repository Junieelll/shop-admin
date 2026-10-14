import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '../.env.local')

let databaseUrl = process.env.DATABASE_URL

if (!databaseUrl && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('DATABASE_URL=')) {
      databaseUrl = trimmed.replace(/^DATABASE_URL=/, '').replace(/^["']|["']$/g, '')
      break
    }
  }
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
})

const initialDresses = [
  { name: 'Mira', price: 800, sizes: ['M'], image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&auto=format&fit=crop&q=80', featured: true, images: ['https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&auto=format&fit=crop&q=80'], collections: ['pink-collection'] },
  { name: 'Blanca', price: 800, sizes: ['M'], image: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&auto=format&fit=crop&q=80', featured: true, images: ['https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&auto=format&fit=crop&q=80'] },
  { name: 'Ivory', price: 800, sizes: ['S'], image: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&auto=format&fit=crop&q=80', featured: false, images: ['https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&auto=format&fit=crop&q=80'] },
  { name: 'Alba', price: 800, sizes: ['S'], image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&auto=format&fit=crop&q=80', featured: false, images: ['https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&auto=format&fit=crop&q=80'] },
  { name: 'Daisy', price: 800, sizes: ['S'], image: 'https://images.unsplash.com/photo-1596783049586-cf180e03cf44?w=800&auto=format&fit=crop&q=80', featured: false, images: ['https://images.unsplash.com/photo-1596783049586-cf180e03cf44?w=800&auto=format&fit=crop&q=80'] },
  { name: 'Petal', price: 800, sizes: ['S', 'M'], image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&auto=format&fit=crop&q=80', featured: true, images: ['https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&auto=format&fit=crop&q=80'], collections: ['pink-collection'] },
  { name: 'Blair', price: 1000, sizes: ['M', 'L'], image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&auto=format&fit=crop&q=80', featured: false, images: ['https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&auto=format&fit=crop&q=80'] },
]

const initialLuxeItems = [
  { name: 'Maison Noir Eau de Parfum', price: 4200, category: 'perfume', image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&auto=format&fit=crop&q=80', featured: true, attributes: { volume: '100ml', scent: 'Amber & Woody' } },
  { name: 'Aura Rose Scent', price: 3800, category: 'perfume', image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&auto=format&fit=crop&q=80', featured: false, attributes: { volume: '50ml', scent: 'Floral' } },
  { name: 'Celestial Diamond Ring', price: 18500, category: 'jewelry', image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&auto=format&fit=crop&q=80', featured: true, attributes: { material: '18K White Gold', gemstone: 'Diamond' } },
  { name: 'Monaco Titanium Sunglasses', price: 5400, category: 'eyeglasses', image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&auto=format&fit=crop&q=80', featured: true, attributes: { frame_shape: 'Aviator', lens_color: 'Polarized Black' } },
]

async function seed() {
  const client = await pool.connect()
  try {
    const existing = await client.query('SELECT COUNT(*) FROM products;')
    if (parseInt(existing.rows[0].count, 10) > 0) {
      console.log('Products already exist in DB. Skipping seed.')
      return
    }

    console.log('Seeding Selyn dresses...')
    const pinkColRes = await client.query("SELECT id FROM collections WHERE store_id = 'selyn' AND slug = 'pink-collection';")
    const pinkColId = pinkColRes.rows[0]?.id

    for (const d of initialDresses) {
      const res = await client.query(`
        INSERT INTO products (store_id, name, price, image, images, featured, attributes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id;
      `, ['selyn', d.name, d.price, d.image, d.images, d.featured, JSON.stringify({ sizes: d.sizes })])

      if (d.collections && pinkColId) {
        await client.query(`
          INSERT INTO product_collections (product_id, collection_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING;
        `, [res.rows[0].id, pinkColId])
      }
    }

    console.log('Seeding Luxe Haven II items...')
    const catMap = {}
    const cats = await client.query("SELECT id, slug FROM categories WHERE store_id = 'luxe-haven';")
    for (const c of cats.rows) {
      catMap[c.slug] = c.id
    }

    for (const item of initialLuxeItems) {
      const catId = catMap[item.category] || null
      await client.query(`
        INSERT INTO products (store_id, category_id, name, price, image, images, featured, attributes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
      `, ['luxe-haven', catId, item.name, item.price, item.image, [item.image], item.featured, JSON.stringify(item.attributes)])
    }

    console.log('Seeding finished successfully!')
  } catch (err) {
    console.error('Seed error:', err)
  } finally {
    client.release()
    await pool.end()
  }
}

seed()
