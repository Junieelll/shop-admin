import { createClient } from '@libsql/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '../.env.local')

let url = process.env.TURSO_DATABASE_URL
let authToken = process.env.TURSO_AUTH_TOKEN

if ((!url || !authToken) && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('TURSO_DATABASE_URL=')) {
      url = trimmed.replace(/^TURSO_DATABASE_URL=/, '').replace(/^["']|["']$/g, '')
    }
    if (trimmed.startsWith('TURSO_AUTH_TOKEN=')) {
      authToken = trimmed.replace(/^TURSO_AUTH_TOKEN=/, '').replace(/^["']|["']$/g, '')
    }
  }
}

if (!url || !authToken) {
  console.error('ERROR: Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .env.local')
  process.exit(1)
}

const client = createClient({ url, authToken })

async function migrate() {
  console.log('Connecting to Turso at', url, '...')

  // 1. Stores
  await client.execute(`
    CREATE TABLE IF NOT EXISTS stores (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)
  await client.execute(`
    INSERT OR IGNORE INTO stores (id, name, description)
    VALUES 
      ('selyn', 'Selyn Dress', 'Dress & Gown Rentals and Sales'),
      ('luxe-haven', 'Luxe Haven II', 'Luxury Perfume, Jewelry, and Eyeglasses');
  `)

  // 2. Categories
  await client.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(store_id, slug)
    );
  `)
  await client.execute(`
    INSERT OR IGNORE INTO categories (store_id, name, slug)
    VALUES
      ('selyn', 'Dresses & Gowns', 'dresses'),
      ('luxe-haven', 'Perfume', 'perfume'),
      ('luxe-haven', 'Jewelry', 'jewelry'),
      ('luxe-haven', 'Eyeglasses', 'eyeglasses');
  `)

  // 3. Collections
  await client.execute(`
    CREATE TABLE IF NOT EXISTS collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT,
      banner_image TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(store_id, slug)
    );
  `)
  await client.execute(`
    INSERT OR IGNORE INTO collections (store_id, name, slug, description)
    VALUES
      ('selyn', 'Pink Collection', 'pink-collection', 'Charming pink dresses and gowns for all occasions');
  `)

  // 4. Products
  await client.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      image TEXT NOT NULL,
      images TEXT DEFAULT '[]',
      featured INTEGER DEFAULT 0,
      description TEXT,
      attributes TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // Indexes for products
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);`)
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_products_featured ON products(store_id, featured);`)
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);`)

  // 5. Product Collections junction table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS product_collections (
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (product_id, collection_id)
    );
  `)
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_pc_collection ON product_collections(collection_id);`)
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_pc_product ON product_collections(product_id);`)

  // 6. Users table for persistent, multi-device custom auth
  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      image TEXT,
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)
  await client.execute(`
    INSERT OR IGNORE INTO users (id, name, email, password, role)
    VALUES ('admin_default', 'Admin', 'admin@shop.com', 'admin', 'admin');
  `)

  console.log('✓ Turso schema created successfully!')

  // Check initial rows
  const stores = await client.execute('SELECT * FROM stores;')
  console.log('Stores:', stores.rows.map(r => r.name))

  const categories = await client.execute('SELECT * FROM categories;')
  console.log('Categories:', categories.rows.map(r => `${r.store_id}: ${r.name}`))

  const collections = await client.execute('SELECT * FROM collections;')
  console.log('Collections:', collections.rows.map(r => `${r.store_id}: ${r.name}`))

  const users = await client.execute('SELECT id, name, email, role FROM users;')
  console.log('Admin Users:', users.rows.map(r => `${r.name} (${r.email})`))
}

migrate().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
