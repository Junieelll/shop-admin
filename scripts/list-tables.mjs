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
const r = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`)
console.log(r.rows.map(x => x.table_name).join('\n'))
await pool.end()
