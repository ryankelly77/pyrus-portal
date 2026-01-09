require('dotenv').config({ path: '.env' })
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

async function main() {
  const client = await pool.connect()
  try {
    await client.query(`
      ALTER TABLE clients
      ADD COLUMN IF NOT EXISTS basecamp_project_id TEXT,
      ADD COLUMN IF NOT EXISTS agency_dashboard_share_key TEXT,
      ADD COLUMN IF NOT EXISTS landingsite_preview_url TEXT
    `)
    console.log('Columns added successfully')
  } finally {
    client.release()
    pool.end()
  }
}

main().catch(console.error)
