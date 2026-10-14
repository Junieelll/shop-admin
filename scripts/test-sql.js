const connStr = 'postgresql://neondb_owner:npg_LtrOiAa5XsP8@ep-young-butterfly-b3es0guf.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
const url = 'https://ep-young-butterfly-b3es0guf.c-4.ap-southeast-1.aws.neon.tech/sql'

async function neonQuery(sql) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Neon-Connection-String': connStr,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql })
  })
  return res.json()
}

async function test() {
  // Test insert
  const insertRes = await neonQuery(`
    INSERT INTO products (store_id, name, price, image, featured, attributes)
    VALUES ('selyn', 'Test Dress', 950, 'https://example.com/test.jpg', false, '{"sizes": ["S", "M"]}')
    RETURNING id, name;
  `)
  console.log('Insert:', insertRes.rows)

  const newId = insertRes.rows[0].id

  // Test toggle featured
  const toggleRes = await neonQuery(`
    UPDATE products SET featured = true WHERE id = ${newId} RETURNING id, featured;
  `)
  console.log('Update:', toggleRes.rows)

  // Test delete
  const delRes = await neonQuery(`
    DELETE FROM products WHERE id = ${newId} RETURNING id;
  `)
  console.log('Delete:', delRes.rows)
}

test().catch(console.error)
