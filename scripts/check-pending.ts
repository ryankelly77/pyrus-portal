import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

async function check() {
  const result = await pool.query("SELECT id, title, status, created_at FROM content WHERE status = 'pending_review'")
  console.log('Pending content:', result.rows.length)
  result.rows.forEach((c: any) => console.log('-', c.title, '|', c.status, '|', c.created_at))
  await pool.end()
}
check()
