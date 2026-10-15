import pg from 'pg'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq > 0) {
    const k = t.slice(0, eq).trim()
    let v = t.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1,-1)
    if (!process.env[k]) process.env[k] = v
  }
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

const r = await pool.query(`
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema = 'neon_auth' AND table_name = 'user'
  ORDER BY ordinal_position
`)
console.log('=== neon_auth.user columns ===')
console.log(r.rows.map(c => `${c.column_name} (${c.data_type}) nullable:${c.is_nullable}`).join('\n'))

// Show a sample row (without sensitive data)
const r2 = await pool.query(`SELECT id, email, name, image, raw_json IS NOT NULL as has_raw_json FROM neon_auth."user" LIMIT 3`)
console.log('\n=== Sample rows ===')
console.log(JSON.stringify(r2.rows, null, 2))

await pool.end()
