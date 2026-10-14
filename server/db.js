import pg from 'pg'

let pool

export function getDb() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is missing')
    }
    pool = new pg.Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    })
  }
  return pool
}
