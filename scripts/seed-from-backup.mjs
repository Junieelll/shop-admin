import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env.local');

// Load .env.local
const env = {};
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.trim().match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (m) {
      let val = (m[2] || '').trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      env[m[1]] = val;
    }
  }
}

const db = createClient({
  url: env.TURSO_DATABASE_URL,
  authToken: env.TURSO_AUTH_TOKEN,
});

const S3_ENDPOINT = (env.AWS_ENDPOINT_URL_S3 || '').replace(/\/$/, '');
const S3_BUCKET = env.S3_BUCKET || 'product-images';

function bucketUrl(filename) {
  return `${S3_ENDPOINT}/${S3_BUCKET}/products/${filename}`;
}

// ── Parse all backup image filenames ──
const backupDir = path.resolve(__dirname, '../backup/images/products');
const allFiles = fs.readdirSync(backupDir);

// Product accumulator: key → { name, price, sizes, files[] }
const products = new Map();

function addToProduct(key, name, price, size, file) {
  if (!products.has(key)) {
    products.set(key, { name, price, sizes: [size], files: [] });
  }
  products.get(key).files.push(file);
}

for (const file of allFiles) {
  const withoutTs = file.replace(/^\d+-/, '');

  // ── Special-case: Sampaguita (WhatsApp/FB pair, timestamps ~1792398238-1792398241) ──
  if (file.includes('5436054191577874413') || file.includes('15.12.56')) {
    addToProduct('sampaguita', 'Sampaguita', 800, 'M', file);
    continue;
  }

  // ── Special-case: Amalia (WhatsApp/FB pair, timestamps ~1792398271-1792398272) ──
  if (file.includes('3247584277644911085') || file.includes('12.43.00')) {
    addToProduct('amalia', 'Amalia', 800, 'S', file);
    continue;
  }

  // ── Special-case: standalone daisy.jpg ──
  if (withoutTs === 'daisy.jpg') {
    addToProduct('daisy_standalone', 'Daisy', 800, 'S', file);
    continue;
  }

  // ── Special-case: standalone blair.jpg — same file as Blair_1000_S, merge later ──
  if (withoutTs === 'blair.jpg') {
    // Will be merged into Blair_1000_S below
    addToProduct('blair_1000_s', 'Blair', 1000, 'S', file);
    continue;
  }

  // ── Standard pattern: Name_Price_Size  (e.g. 1.3_Lily_800_S  or 1.3_Lily_800_S_1_) ──
  const match = withoutTs.match(/([A-Za-z]+)_(\d+)_(XS|S|M|L|XL|2XL)/i);
  if (match) {
    const name = match[1];
    const price = parseInt(match[2], 10);
    const size = match[3].toUpperCase();
    const key = `${name.toLowerCase()}_${price}_${size}`;
    addToProduct(key, name, price, size, file);
  } else {
    console.warn('⚠  Unmatched file (skipped):', file);
  }
}

// ── Deduplicate images within each product ──
// Files like "1792397029851-1.3_Lily_800_S.jpg" and "1792397041761-1.3_Lily_800_S.jpg"
// have the same base name but different timestamps — they're true duplicates.
function dedup(files) {
  const seen = new Map(); // baseName → first filename with that base
  for (const f of files) {
    const base = f.replace(/^\d+-/, '');
    if (!seen.has(base)) seen.set(base, f);
  }
  return [...seen.values()];
}

// ── Build final product list ──
const finalProducts = [];

for (const [key, p] of products.entries()) {
  const uniqueFiles = dedup(p.files);
  const urls = uniqueFiles.map(f => bucketUrl(f));
  finalProducts.push({
    name: p.name,
    price: p.price,
    size: p.sizes[0],
    image: urls[0],
    images: urls,
  });
}

console.log(`\n📦  ${finalProducts.length} products to seed into Turso\n`);

// ── Insert into Turso ──
async function seed() {
  const storeId = 'selyn';

  // Check existing product count
  const countRes = await db.execute({
    sql: 'SELECT COUNT(*) as cnt FROM products WHERE store_id = ?',
    args: [storeId],
  });
  console.log(`Current Selyn product count: ${countRes.rows[0].cnt}`);

  let inserted = 0;
  let skipped = 0;

  for (const p of finalProducts) {
    // Check if product already exists by name
    const existing = await db.execute({
      sql: 'SELECT id FROM products WHERE store_id = ? AND name = ?',
      args: [storeId, p.name],
    });

    if (existing.rows.length > 0) {
      console.log(`  ⏭  "${p.name}" already exists (id=${existing.rows[0].id}), skipping`);
      skipped++;
      continue;
    }

    const imagesJson = JSON.stringify(p.images);
    const attributesJson = JSON.stringify({ sizes: [p.size] });

    const result = await db.execute({
      sql: `
        INSERT INTO products (store_id, name, price, image, images, featured, description, attributes)
        VALUES (?, ?, ?, ?, ?, 0, '', ?)
      `,
      args: [storeId, p.name, p.price, p.image, imagesJson, attributesJson],
    });

    const newId = Number(result.lastInsertRowid);
    console.log(`  ✅  #${newId} — ${p.name} | ₱${p.price} | ${p.size} | ${p.images.length} img(s)`);
    inserted++;
  }

  console.log(`\n🎉  Done! Inserted: ${inserted}  |  Skipped: ${skipped}`);

  // Final count
  const finalCount = await db.execute({
    sql: 'SELECT COUNT(*) as cnt FROM products WHERE store_id = ?',
    args: [storeId],
  });
  console.log(`Total Selyn products now: ${finalCount.rows[0].cnt}\n`);
}

seed().catch(err => {
  console.error('❌  Seed error:', err);
  process.exit(1);
});
