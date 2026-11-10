import { S3Client, DeleteObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3'
import { requireAdmin } from './_auth.js'
import { variantKeys } from './_images.js'

let s3Client

function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    })
  }
  return s3Client
}

// Returns the R2 key for URLs on our public domain, or null for anything else (e.g. old Neon URLs)
function extractKeyFromUrl(url) {
  if (!url) return null
  const base = process.env.R2_PUBLIC_URL.replace(/\/$/, '')
  if (!url.startsWith(base + '/')) return null
  return decodeURIComponent(url.slice(base.length + 1).split('?')[0])
}

export default async function handler(req, res) {
  // Admin only (same-origin, session cookie)
  if (!requireAdmin(req, res)) return

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', ['POST', 'DELETE'])
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const { urls, keys } = req.body || {}
    const bucket = process.env.R2_BUCKET
    const s3 = getS3Client()

    const allKeys = []
    let skipped = 0

    if (Array.isArray(urls)) {
      for (const url of urls) {
        const key = extractKeyFromUrl(url)
        if (key) allKeys.push(key)
        else skipped++
      }
    }
    if (Array.isArray(keys)) allKeys.push(...keys.filter(Boolean))

    // Only allow deleting inside products/
    const originals = allKeys.filter((k) => k.startsWith('products/'))

    // Also remove the resized copies (thumb/large) so they don't pile up as orphans
    const safeKeys = [...new Set(originals.flatMap((k) => {
      const v = variantKeys(k)
      return v ? [k, v.thumb, v.large] : [k]
    }))]

    if (safeKeys.length === 0) {
      // Nothing deletable (e.g. only old Neon URLs). Not an error for the admin UI.
      return res.status(200).json({ success: true, deleted: 0, skipped })
    }

    if (safeKeys.length === 1) {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: safeKeys[0] }))
    } else {
      await s3.send(new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: safeKeys.map((Key) => ({ Key })), Quiet: true },
      }))
    }

    return res.status(200).json({ success: true, deleted: safeKeys.length, skipped, keys: safeKeys })
  } catch (error) {
    console.error('R2 Delete error:', error)
    return res.status(500).json({ error: error.message })
  }
}