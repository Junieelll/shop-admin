import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

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
      forcePathStyle: true, // Essential for custom S3 endpoints like Neon
    })
  }
  return s3Client
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const { filename, fileData, contentType = 'image/jpeg' } = req.body

    if (!fileData) {
      return res.status(400).json({ error: 'Missing fileData (Base64 string)' })
    }

    // Strip base64 metadata prefix if present (e.g. data:image/png;base64,...)
    const base64Data = fileData.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    const cleanFilename = (filename || `upload-${Date.now()}.jpg`).replace(/[^a-zA-Z0-9.-]/g, '_')
    const key = `products/${Date.now()}-${cleanFilename}`
    const bucket = process.env.S3_BUCKET || 'product-images'

    const s3 = getS3Client()
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }))

    // Construct public URL
    const endpoint = (process.env.AWS_ENDPOINT_URL_S3 || '').replace(/\/$/, '')
    const publicUrl = `${endpoint}/${bucket}/${key}`

    return res.status(200).json({
      success: true,
      url: publicUrl,
      key,
    })
  } catch (error) {
    console.error('S3 Upload error:', error)
    return res.status(500).json({ error: error.message })
  }
}
