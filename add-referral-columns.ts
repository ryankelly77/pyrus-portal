import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { Pool } from 'pg'

// Construct the database URL from Supabase project
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const projectRef = supabaseUrl.replace('https://', '').split('.')[0]

// Use the pooler connection (port 6543)
const databaseUrl = `postgresql://postgres.${projectRef}:${process.env.SUPABASE_DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`

console.log('Project ref:', projectRef)

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
})

async function main() {
  const client = await pool.connect()
  
  try {
    console.log('Adding referral columns to clients table...')
    
    // Add columns
    await client.query(`
      ALTER TABLE clients 
      ADD COLUMN IF NOT EXISTS referred_by TEXT,
      ADD COLUMN IF NOT EXISTS referral_source TEXT;
    `)
    
    console.log('Columns added successfully!')
    
    // Verify
    const result = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clients' 
      AND column_name IN ('referred_by', 'referral_source')
    `)
    
    console.log('Verified columns:', result.rows.map(r => r.column_name))
    
  } catch (error: any) {
    console.error('Error:', error.message)
  } finally {
    client.release()
    await pool.end()
  }
}

main()
