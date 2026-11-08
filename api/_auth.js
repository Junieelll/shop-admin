// Shared auth helpers. The leading underscore keeps Vercel from exposing this file as a route.
import { createHmac, pbkdf2, randomBytes, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const pbkdf2Async = promisify(pbkdf2)

const COOKIE_NAME = 'shop_admin_session'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

// ---------------------------------------------------------------------------
// Passwords. Same format as the old browser code ("saltHex:hashHex",
// PBKDF2-HMAC-SHA256, 100k iterations), so existing hashes keep working.
// ---------------------------------------------------------------------------

export async function hashPassword(password, saltHex = randomBytes(16).toString('hex')) {
  const derived = await pbkdf2Async(password, Buffer.from(saltHex, 'hex'), 100000, 32, 'sha256')
  return `${saltHex}:${derived.toString('hex')}`
}

function safeEqual(a, b) {
  const ab = Buffer.from(String(a))
  const bb = Buffer.from(String(b))
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

export function isLegacyHash(stored) {
  return !String(stored || '').includes(':')
}

export async function verifyPassword(password, stored) {
  if (!password || !stored) return false
  if (isLegacyHash(stored)) return safeEqual(password, stored) // old plain-text rows
  const [saltHex] = stored.split(':')
  return safeEqual(await hashPassword(password, saltHex), stored)
}

// ---------------------------------------------------------------------------
// Session: a signed token in an HttpOnly cookie. Stateless, so checking it
// costs no database reads.
// ---------------------------------------------------------------------------

function getSecret() {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET is missing or too short (use 32+ characters)')
  }
  return secret
}

function sign(data) {
  return createHmac('sha256', getSecret()).update(data).digest('base64url')
}

function createSessionToken(user) {
  const payload = Buffer.from(
    JSON.stringify({
      uid: user.id,
      role: user.role || 'admin',
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    })
  ).toString('base64url')
  return `${payload}.${sign(payload)}`
}

function parseCookies(header = '') {
  const out = {}
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx > 0) out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim())
  }
  return out
}

/** Returns { uid, role, exp } for a valid session cookie, otherwise null. */
export function readSession(req) {
  getSecret() // throw loudly if the env var is missing instead of silently logging everyone out
  try {
    const token = parseCookies(req.headers.cookie)[COOKIE_NAME]
    if (!token) return null
    const [payload, sig] = token.split('.')
    if (!payload || !sig || !safeEqual(sig, sign(payload))) return null
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (!data.uid || data.exp < Math.floor(Date.now() / 1000)) return null
    return data
  } catch {
    return null
  }
}

export function setSessionCookie(res, user) {
  const secure = process.env.VERCEL ? '; Secure' : ''
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${createSessionToken(user)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${secure}`
  )
}

export function clearSessionCookie(res) {
  const secure = process.env.VERCEL ? '; Secure' : ''
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`)
}

/**
 * Use at the top of any protected handler:
 *   if (!requireAdmin(req, res)) return
 */
export function requireAdmin(req, res) {
  const session = readSession(req)
  if (!session || session.role !== 'admin') {
    res.status(401).json({ error: 'Unauthorized' })
    return null
  }
  return session
}