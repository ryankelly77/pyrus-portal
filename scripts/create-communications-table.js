const { PrismaPg } = require('@prisma/adapter-pg')
const { PrismaClient } = require('@prisma/client')
const { Pool } = require('pg')
require('dotenv').config()

async function main() {
  const connectionString = process.env.DATABASE_URL
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  // Create the client_communications table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS client_communications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      comm_type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      subject VARCHAR(500),
      body TEXT,
      status VARCHAR(50) DEFAULT 'sent',
      metadata JSONB,
      highlight_type VARCHAR(20),
      recipient_email VARCHAR(255),
      opened_at TIMESTAMPTZ,
      clicked_at TIMESTAMPTZ,
      sent_at TIMESTAMPTZ DEFAULT NOW(),
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  // Create index for faster queries
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_client_communications_client_id ON client_communications(client_id)
  `)
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_client_communications_sent_at ON client_communications(sent_at DESC)
  `)

  console.log('Created client_communications table')

  await pool.end()
  await prisma.$disconnect()
}

main().catch(console.error)
