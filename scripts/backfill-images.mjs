// One-time backfill: creates the resized WebP copies (thumb 600px, large 1000px) for every
// original image already in the R2 bucket. Safe to re-run: files that already have both copies are skipped.
//
// Usage (from the shop-admin project root):
//   npm install sharp
//   node --env-file=.env scripts/backfill-images.mjs --dry-run      # only report what would be done
//   node --env-file=.env scripts/backfill-images.mjs --limit 5      # try a few first
//   node --env-file=.env scripts/backfill-images.mjs                # do everything
//
// Needs these variables in .env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
// The R2 API token needs read AND write access to the bucket. Originals are never modified or deleted.

import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { variantKeys, THUMB_WIDTH, LARGE_WIDTH, WEBP_QUALITY } from '../api/_images.js'

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const limitIdx = args.indexOf('--limit')
const LIMIT = limitIdx !== -1 ? Number(args[limitIdx + 1]) : Infinity
const CONCURRENCY = 4
const IMAGE_EXT = /\.(jpe?g|png|webp|avif|tiff?)$/i // gif/svg are skipped on purpose
const CACHE_CONTROL = 'public, max-age=31536000, immutable'

for (const name of ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET']) {
  if (!process.env[name]) {
    console.error(`Missing ${name}. Run with: node --env-file=.env scripts/backfill-images.mjs`)
    process.exit(1)
  }
}

const bucket = process.env.R2_BUCKET
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
})

async function listAll(prefix) {
  const keys = []
  let token
  do {
    const out = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }))
    for (const o of out.Contents || []) keys.push({ key: o.Key, size: o.Size })
    token = out.IsTruncated ? out.NextContinuationToken : undefined
  } while (token)
  return keys
}

async function processOne(key) {
  const keys = variantKeys(key)
  const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
  const original = Buffer.from(await obj.Body.transformToByteArray())

  const make = (width) =>
    sharp(original, { failOn: 'none' })
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer()

  const [thumb, large] = await Promise.all([make(THUMB_WIDTH), make(LARGE_WIDTH)])
  await Promise.all([
    s3.send(new PutObjectCommand({ Bucket: bucket, Key: keys.thumb, Body: thumb, ContentType: 'image/webp', CacheControl: CACHE_CONTROL })),
    s3.send(new PutObjectCommand({ Bucket: bucket, Key: keys.large, Body: large, ContentType: 'image/webp', CacheControl: CACHE_CONTROL })),
  ])
  return { before: original.length, thumb: thumb.length, large: large.length }
}

async function main() {
  console.log(`Listing products/ in bucket "${bucket}"...`)
  const all = await listAll('products/')
  const existing = new Set(all.map((o) => o.key))

  const todo = []
  let skippedDone = 0
  let skippedType = 0
  for (const { key } of all) {
    const v = variantKeys(key)
    if (!v) continue // already a thumb/ or large/ file
    if (!IMAGE_EXT.test(key)) { skippedType++; continue }
    if (existing.has(v.thumb) && existing.has(v.large)) { skippedDone++; continue }
    todo.push(key)
  }

  const batch = todo.slice(0, LIMIT)
  console.log(`Originals: ${todo.length + skippedDone + skippedType}`)
  console.log(`  already done: ${skippedDone}, not an image type: ${skippedType}, to process: ${todo.length}`)
  if (batch.length < todo.length) console.log(`  (--limit: processing only ${batch.length} now)`)

  if (DRY_RUN) {
    batch.slice(0, 10).forEach((k) => console.log('  would process', k))
    if (batch.length > 10) console.log(`  ...and ${batch.length - 10} more`)
    console.log('Dry run: nothing was written.')
    return
  }

  let done = 0
  let failed = 0
  let bytesBefore = 0
  let bytesAfter = 0
  const queue = [...batch]

  async function worker() {
    while (queue.length) {
      const key = queue.shift()
      try {
        const r = await processOne(key)
        bytesBefore += r.before
        bytesAfter += r.thumb + r.large
        done++
        console.log(`[${done + failed}/${batch.length}] ok   ${key}  ${(r.before / 1024).toFixed(0)} KB -> thumb ${(r.thumb / 1024).toFixed(0)} KB, large ${(r.large / 1024).toFixed(0)} KB`)
      } catch (err) {
        failed++
        console.error(`[${done + failed}/${batch.length}] FAIL ${key}: ${err.message}`)
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  console.log(`\nDone. Created copies for ${done} images, ${failed} failed.`)
  console.log(`Originals read: ${(bytesBefore / 1048576).toFixed(1)} MB. New files added: ${(bytesAfter / 1048576).toFixed(1)} MB.`)
  if (failed) console.log('Re-run the script to retry the failed ones.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
