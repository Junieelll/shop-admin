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

// Find all schemas and tables with user/auth in the name
const r1 = await pool.query(`
  SELECT table_schema, table_name 
  FROM information_schema.tables 
  WHERE table_name ILIKE '%user%' OR table_name ILIKE '%auth%'
  ORDER BY table_schema, table_name
`)
console.log('=== Auth/User tables across all schemas ===')
console.log(JSON.stringify(r1.rows, null, 2))

// Also list all schemas
const r2 = await pool.query(`SELECT DISTINCT table_schema FROM information_schema.tables ORDER BY table_schema`)
console.log('\n=== All schemas ===')
console.log(r2.rows.map(x => x.table_schema).join(', '))

await pool.end()
