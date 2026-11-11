// Remembers each store's dashboard data (products, collections, categories) in the browser,
// so the dashboard can show it instantly and then refresh it in the background.
// Kept in IndexedDB (hundreds of MB available) with an in-memory copy for fast repeat reads.
const DB_NAME = 'shop-admin-cache'
const STORE = 'kv'
const SCHEMA = 1 // bump when the shape of the cached data changes; old entries are ignored

const memory = new Map()

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'))
      return
    }
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbGet(key) {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).get(key)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

async function idbSet(key, value) {
  try {
    const db = await openDb()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(value, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.warn('Admin cache write failed:', err)
  }
}

const keyFor = (storeId) => `store:${storeId}`

/** Returns { products, collections, categories } for a store, or null if nothing is remembered. */
export async function readStoreCache(storeId) {
  const key = keyFor(storeId)
  let rec = memory.get(key)
  if (!rec) {
    rec = await idbGet(key)
    if (rec) memory.set(key, rec)
  }
  if (!rec || rec.schema !== SCHEMA || !Array.isArray(rec.products)) return null
  return {
    products: rec.products,
    collections: Array.isArray(rec.collections) ? rec.collections : [],
    categories: Array.isArray(rec.categories) ? rec.categories : [],
  }
}

export function writeStoreCache(storeId, { products, collections, categories }) {
  const rec = { schema: SCHEMA, savedAt: Date.now(), products, collections, categories }
  memory.set(keyFor(storeId), rec)
  return idbSet(keyFor(storeId), rec)
}

/** Call on logout if the computer is shared. */
export async function clearStoreCaches() {
  memory.clear()
  try {
    const db = await openDb()
    db.transaction(STORE, 'readwrite').objectStore(STORE).clear()
  } catch {
    // ignore
  }
}