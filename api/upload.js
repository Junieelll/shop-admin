import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { requireAdmin } from './_auth.js'

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
      // Newer AWS SDK versions add checksum headers that R2 can reject
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    })
  }
  return s3Client
}

export default async function handler(req, res) {
  // Admin only (same-origin, session cookie)
  if (!requireAdmin(req, res)) return

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const { filename, fileData, contentType = 'image/jpeg' } = req.body || {}

    if (!fileData) {
      return res.status(400).json({ error: 'Missing fileData (Base64 string)' })
    }

    const base64Data = fileData.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    const cleanFilename = (filename || `upload-${Date.now()}.jpg`).replace(/[^a-zA-Z0-9.-]/g, '_')
    const key = `products/${Date.now()}-${cleanFilename}`
    const bucket = process.env.R2_BUCKET

    await getS3Client().send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable', // keys are unique, so safe to cache long
    }))

    const publicUrl = `${process.env.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`

    return res.status(200).json({ success: true, url: publicUrl, key })
  } catch (error) {
    console.error('R2 Upload error:', error)
    return res.status(500).json({ error: error.message })
  }
}