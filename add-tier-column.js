require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

async function main() {
  const client = await pool.connect()
  try {
    // Add tier column if it doesn't exist
    await client.query(`
      ALTER TABLE recommendation_items
      ADD COLUMN IF NOT EXISTS tier TEXT
    `)
    console.log('Added tier column to recommendation_items')

    // Verify the column was added
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'recommendation_items' AND column_name = 'tier'
    `)
    console.log('Column exists:', result.rows.length > 0)
  } finally {
    client.release()
    pool.end()
  }
}

main().catch(console.error)
