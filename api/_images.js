// Shared image-variant helpers. The leading underscore keeps Vercel from exposing this file as a route.
//
// Every original upload at   products/<name>.<ext>
// gets two resized copies at products/thumb/<name>.webp  (cards, grids)
//                            products/large/<name>.webp  (product modal)
// The storefront derives the variant URLs from the original URL, so no database change is needed.

export const THUMB_WIDTH = 600
export const LARGE_WIDTH = 1000
export const WEBP_QUALITY = 78

/** Returns { thumb, large } keys for an ORIGINAL key, or null if the key is not an original. */
export function variantKeys(key) {
  if (typeof key !== 'string' || !key.startsWith('products/')) return null
  const rest = key.slice('products/'.length)
  if (!rest || /^(thumb|large)\//.test(rest)) return null
  const base = rest.replace(/\.[^./]+$/, '')
  return { thumb: `products/thumb/${base}.webp`, large: `products/large/${base}.webp` }
}