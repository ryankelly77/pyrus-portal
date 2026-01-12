/**
 * Script to add the highlevel_oauth table for storing OAuth tokens
 * Run with: npx tsx scripts/add-highlevel-oauth-table.ts
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import { Pool } from 'pg'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })

  console.log('Creating highlevel_oauth table...')

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS highlevel_oauth (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        location_id VARCHAR(255) NOT NULL UNIQUE,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        token_type VARCHAR(50) DEFAULT 'Bearer',
        expires_at TIMESTAMPTZ NOT NULL,
        scope TEXT,
        user_type VARCHAR(50),
        company_id VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    console.log('✅ Table created successfully!')

    // Check if table exists
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'highlevel_oauth'
      ORDER BY ordinal_position
    `)

    console.log('\nTable structure:')
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`)
    })

  } catch (error) {
    console.error('Error creating table:', error)
  } finally {
    await pool.end()
  }
}

main()
