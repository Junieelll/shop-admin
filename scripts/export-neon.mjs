// Put this in shop-admin/scripts/ and run:  node scripts/export-neon.mjs
// Uses packages you already have (pg, @aws-sdk/client-s3). Needs a .env.local with:
//   DATABASE_URL, AWS_ENDPOINT_URL_S3, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET, AWS_REGION
// Output goes to ./backup (db/*.json and images/*)

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'backup')

// minimal .env.local loader
const envPath = path.join(root, '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.trim().match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

fs.mkdirSync(path.join(out, 'db'), { recursive: true })
fs.mkdirSync(path.join(out, 'images'), { recursive: true })

// ---------- 1. Database -> JSON ----------
async function dumpDb() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })
  try {
    for (const t of ['stores', 'categories', 'collections', 'products', 'product_collections']) {
      const { rows } = await pool.query(`SELECT * FROM ${t}`)
      fs.writeFileSync(path.join(out, 'db', `${t}.json`), JSON.stringify(rows, null, 2))
      console.log(`DB  ${t}: ${rows.length} rows`)
    }
  } finally {
    await pool.end()
  }
}

// ---------- 2. Bucket -> local files ----------
async function downloadImages() {
  const s3 = new S3Client({
    endpoint: process.env.AWS_ENDPOINT_URL_S3,
    region: process.env.AWS_REGION || 'ap-southeast-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  })
  const Bucket = process.env.S3_BUCKET || 'product-images'

  let token, count = 0
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket, ContinuationToken: token }))
    for (const obj of page.Contents || []) {
      if (obj.Key.endsWith('/')) continue
      const dest = path.join(out, 'images', obj.Key)
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      const res = await s3.send(new GetObjectCommand({ Bucket, Key: obj.Key }))
      fs.writeFileSync(dest, Buffer.from(await res.Body.transformToByteArray()))
      count++
      console.log(`IMG ${count}: ${obj.Key}`)
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined
  } while (token)
  console.log(`Downloaded ${count} images`)
}

// each step runs on its own so one failing doesn't block the other
for (const [name, fn] of [['database', dumpDb], ['images', downloadImages]]) {
  try { await fn() } catch (e) { console.error(`${name} export FAILED:`, e.message) }
}
