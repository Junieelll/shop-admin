import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { requireAdmin } from './_auth.js'
import { variantKeys, THUMB_WIDTH, LARGE_WIDTH, WEBP_QUALITY } from './_images.js'

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

    const s3 = getS3Client()
    const cacheControl = 'public, max-age=31536000, immutable' // keys are unique, so safe to cache long

    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: cacheControl,
    }))

    // Resized copies for fast loading. If this fails the original is still saved and the
    // storefront falls back to it, so the upload itself never fails because of resizing.
    let variants = false
    try {
      const keys = variantKeys(key)
      if (keys) {
        const make = (width) =>
          sharp(buffer, { failOn: 'none' })
            .rotate() // respect phone-camera orientation
            .resize({ width, withoutEnlargement: true })
            .webp({ quality: WEBP_QUALITY })
            .toBuffer()

        const [thumbBuf, largeBuf] = await Promise.all([make(THUMB_WIDTH), make(LARGE_WIDTH)])
        await Promise.all([
          s3.send(new PutObjectCommand({ Bucket: bucket, Key: keys.thumb, Body: thumbBuf, ContentType: 'image/webp', CacheControl: cacheControl })),
          s3.send(new PutObjectCommand({ Bucket: bucket, Key: keys.large, Body: largeBuf, ContentType: 'image/webp', CacheControl: cacheControl })),
        ])
        variants = true
      }
    } catch (resizeErr) {
      console.warn('Image resize skipped:', resizeErr)
    }

    const publicUrl = `${process.env.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`

    return res.status(200).json({ success: true, url: publicUrl, key, variants })
  } catch (error) {
    console.error('R2 Upload error:', error)
    return res.status(500).json({ error: error.message })
  }
}