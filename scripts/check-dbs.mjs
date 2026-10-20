import { createClient } from '@libsql/client';
import pg from 'pg';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = (match[2] || '').trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    env[match[1]] = val;
  }
}

async function checkTurso() {
  console.log('--- Checking Turso ---');
  try {
    const db = createClient({
      url: env.TURSO_DATABASE_URL,
      authToken: env.TURSO_AUTH_TOKEN
    });
    const count = await db.execute('SELECT COUNT(*) as cnt FROM products');
    console.log('Turso product count:', count.rows[0].cnt);
    const sample = await db.execute('SELECT id, store_id, name, price, image, images, attributes FROM products LIMIT 5');
    console.log('Turso sample:', JSON.stringify(sample.rows, null, 2));
  } catch (e) {
    console.error('Turso error:', e.message);
  }
}

async function checkNeon() {
  console.log('--- Checking Neon ---');
  try {
    const pool = new pg.Pool({
      connectionString: env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    const res = await pool.query('SELECT COUNT(*) as cnt FROM products');
    console.log('Neon product count:', res.rows[0].cnt);
    const sample = await pool.query('SELECT id, store_id, name, price, image, images, attributes FROM products LIMIT 5');
    console.log('Neon sample:', JSON.stringify(sample.rows, null, 2));
    await pool.end();
  } catch (e) {
    console.error('Neon error:', e.message);
  }
}

async function main() {
  await checkTurso();
  await checkNeon();
}

main().catch(console.error);
