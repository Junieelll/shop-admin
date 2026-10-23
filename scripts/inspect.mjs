import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf8');
let url = '', authToken = '';
for (const line of envContent.split('\n')) {
  if (line.startsWith('VITE_TURSO_DATABASE_URL=')) url = line.replace('VITE_TURSO_DATABASE_URL=', '').trim().replace(/^["']|["']$/g, '');
  if (line.startsWith('VITE_TURSO_AUTH_TOKEN=')) authToken = line.replace('VITE_TURSO_AUTH_TOKEN=', '').trim().replace(/^["']|["']$/g, '');
}

const db = createClient({ url, authToken });

async function run() {
  const pragma = await db.execute('PRAGMA table_info(products)');
  console.log('Columns:', pragma.rows.map(r => r.name));
  const res = await db.execute('SELECT id, name, price, attributes FROM products WHERE store_id = "luxe-haven" LIMIT 2');
  console.log('Sample rows:', JSON.stringify(res.rows, null, 2));
}

run();
