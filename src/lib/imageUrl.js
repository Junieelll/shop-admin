// Resized image copies, created by /api/upload when an image is uploaded:
//   products/<name>.jpg        original
//   products/thumb/<name>.webp 600px  -> lists, cards, thumbnails
//   products/large/<name>.webp 1000px -> big previews
// Pass the original URL. Anything that is not on the CDN (base64 previews, old URLs)
// or is already a resized copy is returned unchanged.
const PRODUCTS_BASE = 'https://cdn.luxehavenph.com/products/'

export function imgUrl(src, width = 600) {
  if (!src || typeof src !== 'string' || !src.startsWith(PRODUCTS_BASE)) return src
  const rest = src.slice(PRODUCTS_BASE.length)
  if (/^(thumb|large)\//.test(rest)) return src
  const base = rest.replace(/\.[^./]+$/, '')
  return `${PRODUCTS_BASE}${width <= 700 ? 'thumb' : 'large'}/${base}.webp`
}

export const thumbUrl = (src) => imgUrl(src, 600)

// onError handler: if a resized copy is missing, show the original instead of a broken image.
export function fallbackToOriginal(original) {
  return (e) => {
    const img = e.currentTarget
    if (original && img.src !== original) {
      img.onerror = null
      img.src = original
    }
  }
}