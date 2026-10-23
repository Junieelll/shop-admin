import { S3Client, DeleteObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3'

let s3Client

function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: process.env.AWS_ENDPOINT_URL_S3,
      region: process.env.AWS_REGION || 'ap-southeast-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    })
  }
  return s3Client
}

/**
 * Extract the S3 object key from a full URL or return as-is if already a key.
 * e.g. "https://...neon.tech/product-images/products/1234-photo.jpg" → "products/1234-photo.jpg"
 */
function extractKeyFromUrl(urlOrKey, bucket) {
  if (!urlOrKey) return null
  try {
    const url = new URL(urlOrKey)
    // URL path format: /<bucket>/<key>
    const pathParts = url.pathname.split(`/${bucket}/`)
    if (pathParts.length > 1) {
      return pathParts[1]
    }
    // Fallback: remove leading slash
    return url.pathname.replace(/^\//, '')
  } catch {
    // Not a URL, treat as a raw key
    return urlOrKey
  }
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', ['POST', 'DELETE'])
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const { urls, keys } = req.body || {}
    const bucket = process.env.S3_BUCKET || 'product-images'
    const s3 = getS3Client()

    // Collect all keys to delete (from either urls or keys array)
    const allKeys = []

    if (Array.isArray(urls)) {
      for (const url of urls) {
        const key = extractKeyFromUrl(url, bucket)
        if (key) allKeys.push(key)
      }
    }

    if (Array.isArray(keys)) {
      allKeys.push(...keys.filter(Boolean))
    }

    if (allKeys.length === 0) {
      return res.status(400).json({ error: 'No valid keys or urls provided' })
    }

    // Use batch delete for multiple objects, single delete for one
    if (allKeys.length === 1) {
      await s3.send(new DeleteObjectCommand({
        Bucket: bucket,
        Key: allKeys[0],
      }))
    } else {
      await s3.send(new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: allKeys.map(Key => ({ Key })),
          Quiet: true,
        },
      }))
    }

    return res.status(200).json({
      success: true,
      deleted: allKeys.length,
      keys: allKeys,
    })
  } catch (error) {
    console.error('S3 Delete error:', error)
    return res.status(500).json({ error: error.message })
  }
}
