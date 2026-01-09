import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient
  pool: Pool
}

// Create a shared pool with connection limits
// Supabase pooler has limited slots - keep this small
const pool = globalForPrisma.pool || new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5, // Maximum 5 connections in the pool
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 10000, // Timeout after 10s if can't connect
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.pool = pool
}

const adapter = new PrismaPg(pool)

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Export pool for raw SQL queries (use sparingly)
export { pool as dbPool }

export default prisma
