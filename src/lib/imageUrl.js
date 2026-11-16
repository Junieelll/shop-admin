// Resized image copies, created by /api/upload when an image is uploaded:
//   products/<name>.jpg        original
//   products/thumb/<name>.webp 600px  -> lists, cards, thumbnails
//   products/large/<name>.webp 1000px -> big previews
// Pass the original URL. Anything that is not on the CDN (base64 previews, old URLs)
// or is already a resized copy is returned unchanged.
const PRODUCTS_BASE = 'https://cdn.luxehavenph.com/products/'
const CDN_PRODUCTS_PREFIX = /^(?:(?:https?:)?\/\/)?\/?cdn\.luxehavenph\.com\/products\//i

function normalizeImageUrl(src) {
  if (typeof src !== 'string') return src
  const value = src.trim()
  return CDN_PRODUCTS_PREFIX.test(value)
    ? value.replace(CDN_PRODUCTS_PREFIX, PRODUCTS_BASE)
    : value
}

export function imgUrl(src, width = 600) {
  const normalized = normalizeImageUrl(src)
  if (!normalized || typeof normalized !== 'string' || !normalized.startsWith(PRODUCTS_BASE)) return normalized
  const rest = normalized.slice(PRODUCTS_BASE.length)
  if (/^(thumb|large)\//.test(rest)) return normalized
  const base = rest.replace(/\.[^./]+$/, '')
  return `${PRODUCTS_BASE}${width <= 700 ? 'thumb' : 'large'}/${base}.webp`
}

export const thumbUrl = (src) => imgUrl(src, 600)

// onError handler: if a resized copy is missing, show the original instead of a broken image.
export function fallbackToOriginal(original) {
  return (e) => {
    const img = e.currentTarget
    const fallback = normalizeImageUrl(original)
    if (fallback && img.src !== fallback) {
      img.onerror = null
      img.src = fallback
    }
  }
}