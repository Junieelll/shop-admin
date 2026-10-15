import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import productsHandler from '../api/products.js'
import collectionsHandler from '../api/collections.js'
import uploadHandler from '../api/upload.js'
import updateEmailHandler from '../api/update-email.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envLocalPath = path.resolve(__dirname, '../.env.local')

if (fs.existsSync(envLocalPath)) {
  const lines = fs.readFileSync(envLocalPath, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim()
      let val = trimmed.slice(eqIdx + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) {
        process.env[key] = val
      }
    }
  }
}

export function viteApiPlugin() {
  return {
    name: 'vite-api-plugin',
    configureServer(server) {
      const apiMiddleware = async (req, res, next) => {
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
        let pathname = url.pathname
        if (pathname.startsWith('/api/db/')) {
          pathname = pathname.replace('/api/db/', '/api/')
        }

        if (pathname !== '/api/products' && pathname !== '/api/collections' && pathname !== '/api/upload' && pathname !== '/api/update-email') {
          return next()
        }

        try {
          // Read body if POST/PUT/PATCH/DELETE
          let body = {}
          if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
            const chunks = []
            for await (const chunk of req) {
              chunks.push(chunk)
            }
            const rawBody = Buffer.concat(chunks).toString()
            if (rawBody) {
              try {
                body = JSON.parse(rawBody)
              } catch {
                body = {}
              }
            }
          }

          const vercelReq = Object.assign(req, {
            body,
            query: Object.fromEntries(url.searchParams.entries()),
          })

          const vercelRes = Object.assign(res, {
            status(code) {
              res.statusCode = code
              return vercelRes
            },
            json(data) {
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(data))
              return vercelRes
            },
            send(data) {
              res.end(data)
              return vercelRes
            },
          })

          if (pathname === '/api/products') {
            return await productsHandler(vercelReq, vercelRes)
          }

          if (pathname === '/api/collections') {
            return await collectionsHandler(vercelReq, vercelRes)
          }

          if (pathname === '/api/upload') {
            return await uploadHandler(vercelReq, vercelRes)
          }

          if (pathname === '/api/update-email') {
            return await updateEmailHandler(vercelReq, vercelRes)
          }

          next()
        } catch (err) {
          console.error('Vite API middleware error:', err)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: err.message }))
        }
      }

      server.middlewares.stack.unshift({ route: '', handle: apiMiddleware })
    },
  }
}
