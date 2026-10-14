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

if (!databaseUrl) {
  console.error('ERROR: No DATABASE_URL found in .env.local or environment.')
  process.exit(1)
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
})

const migrationSql = `
-- 1. Stores Table
CREATE TABLE IF NOT EXISTS stores (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed initial stores
INSERT INTO stores (id, name, description)
VALUES 
  ('selyn', 'Selyn Dress', 'Dress & Gown Rentals and Sales'),
  ('luxe-haven', 'Luxe Haven II', 'Luxury Perfume, Jewelry, and Eyeglasses')
ON CONFLICT (id) DO NOTHING;

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    store_id VARCHAR(50) NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(store_id, slug)
);

-- Seed initial categories
INSERT INTO categories (store_id, name, slug)
VALUES
  ('selyn', 'Dresses & Gowns', 'dresses'),
  ('luxe-haven', 'Perfume', 'perfume'),
  ('luxe-haven', 'Jewelry', 'jewelry'),
  ('luxe-haven', 'Eyeglasses', 'eyeglasses')
ON CONFLICT (store_id, slug) DO NOTHING;

-- 3. Collections Table
CREATE TABLE IF NOT EXISTS collections (
    id SERIAL PRIMARY KEY,
    store_id VARCHAR(50) NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    banner_image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(store_id, slug)
);

-- Seed Pink Collection for Selyn
INSERT INTO collections (store_id, name, slug, description)
VALUES
  ('selyn', 'Pink Collection', 'pink-collection', 'Charming pink dresses and gowns for all occasions')
ON CONFLICT (store_id, slug) DO NOTHING;

-- 4. Products Table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    store_id VARCHAR(50) NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    image TEXT NOT NULL,
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    featured BOOLEAN DEFAULT FALSE,
    description TEXT,
    attributes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(store_id, featured);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_attributes ON products USING gin(attributes);

-- 5. Product Collections Junction Table
CREATE TABLE IF NOT EXISTS product_collections (
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (product_id, collection_id)
);

CREATE INDEX IF NOT EXISTS idx_prod_col_collection ON product_collections(collection_id);
CREATE INDEX IF NOT EXISTS idx_prod_col_product ON product_collections(product_id);
`

async function run() {
  console.log('Connecting to Neon database...')
  const client = await pool.connect()
  try {
    console.log('Running migration...')
    await client.query(migrationSql)
    console.log('Migration completed successfully!')

    // Verify tables
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('stores', 'categories', 'collections', 'products', 'product_collections');
    `)
    console.log('Verified tables in Neon:', res.rows.map(r => r.table_name))

    // Verify stores
    const stores = await client.query('SELECT * FROM stores;')
    console.log('Configured stores:', stores.rows)

    // Verify collections
    const cols = await client.query('SELECT * FROM collections;')
    console.log('Configured collections:', cols.rows)
  } catch (err) {
    console.error('Migration failed:', err)
  } finally {
    client.release()
    await pool.end()
  }
}

run()
