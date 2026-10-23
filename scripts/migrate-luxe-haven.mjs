import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env.local');

let url = process.env.VITE_TURSO_DATABASE_URL;
let authToken = process.env.VITE_TURSO_AUTH_TOKEN;

if ((!url || !authToken) && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('VITE_TURSO_DATABASE_URL=')) {
      url = trimmed.replace(/^VITE_TURSO_DATABASE_URL=/, '').replace(/^["']|["']$/g, '');
    }
    if (trimmed.startsWith('VITE_TURSO_AUTH_TOKEN=')) {
      authToken = trimmed.replace(/^VITE_TURSO_AUTH_TOKEN=/, '').replace(/^["']|["']$/g, '');
    }
  }
}

if (!url || !authToken) {
  console.error('ERROR: Missing VITE_TURSO_DATABASE_URL or VITE_TURSO_AUTH_TOKEN');
  process.exit(1);
}

const db = createClient({ url, authToken });

async function run() {
  console.log('Connecting to Turso...');

  // 1. Ensure categories table has updated categories for luxe-haven
  console.log('Updating categories for luxe-haven...');
  await db.execute({
    sql: `DELETE FROM categories WHERE store_id = ?`,
    args: ['luxe-haven']
  });

  const categories = [
    { name: 'Perfume for Women', slug: 'perfume-for-women' },
    { name: 'Perfume for Men', slug: 'perfume-for-men' },
    { name: 'Perfume Sets', slug: 'perfume-sets' },
    { name: 'Eyewear for Women', slug: 'eyewear-for-women' },
    { name: 'Eyewear for Men', slug: 'eyewear-for-men' }
  ];

  for (const cat of categories) {
    await db.execute({
      sql: `INSERT INTO categories (store_id, name, slug) VALUES (?, ?, ?)`,
      args: ['luxe-haven', cat.name, cat.slug]
    });
  }

  // Fetch created category IDs mapping
  const catRes = await db.execute({
    sql: `SELECT id, name, slug FROM categories WHERE store_id = ?`,
    args: ['luxe-haven']
  });
  const catMap = {};
  for (const row of catRes.rows) {
    catMap[row.slug] = row.id;
  }
  console.log('Categories created:', catMap);

  // 2. Read products from luxe-haven/src/data/products.js
  const luxeProductsPath = path.resolve(__dirname, '../../luxe-haven/src/data/products.js');
  const luxeProductsModule = await import(`file://${luxeProductsPath}`);
  const staticProducts = luxeProductsModule.PRODUCTS || [];

  console.log(`Found ${staticProducts.length} static products to sync.`);

  // Clear existing luxe-haven products if any
  await db.execute({
    sql: `DELETE FROM products WHERE store_id = ?`,
    args: ['luxe-haven']
  });

  for (const prod of staticProducts) {
    const catId = catMap[prod.category] || null;
    const notesStr = prod.notes
      ? Object.values(prod.notes).join(', ')
      : '';

    const attributes = {
      brand: prod.brand || '',
      originalPrice: prod.originalPrice || null,
      volume: prod.volume || '',
      concentration: prod.concentration || '',
      notes: notesStr,
      rating: prod.rating || 5.0,
      reviewsCount: prod.reviewsCount || 0
    };

    const isBestseller = Boolean(prod.isBestseller);
    const images = Array.isArray(prod.images) && prod.images.length > 0
      ? prod.images
      : (prod.image ? [prod.image] : []);

    await db.execute({
      sql: `
        INSERT INTO products (store_id, category_id, name, price, image, images, featured, description, attributes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        'luxe-haven',
        catId,
        prod.name,
        prod.price,
        prod.image,
        JSON.stringify(images),
        isBestseller ? 1 : 0,
        prod.description || '',
        JSON.stringify(attributes)
      ]
    });
  }

  const check = await db.execute({
    sql: `SELECT COUNT(*) as c FROM products WHERE store_id = ?`,
    args: ['luxe-haven']
  });

  console.log(`Successfully migrated! Total Luxe Haven products in Turso: ${check.rows[0].c}`);
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
