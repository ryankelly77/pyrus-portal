/**
 * Prisma Database Client Configuration
 *
 * This module configures Prisma with connection pooling optimized for:
 * - Supabase PostgreSQL with Supavisor connection pooler
 * - Next.js serverless environment (API routes, Server Components)
 * - Transaction mode for efficient connection sharing
 *
 * ## Connection Architecture
 *
 * ```
 * Next.js App (multiple requests)
 *      ↓
 * Local pg Pool (max 5 connections)
 *      ↓
 * Supavisor Pooler (port 6543, Transaction mode)
 *      ↓
 * PostgreSQL Database (60 direct connections available)
 * ```
 *
 * ## Key Optimizations
 *
 * 1. **Transaction Mode (port 6543)**: Connections are returned to pool after
 *    each transaction, allowing 200+ concurrent requests with fewer connections.
 *    Session mode (port 5432) holds connections per session, exhausting limits.
 *
 * 2. **pgbouncer=true**: Disables prepared statements which aren't supported
 *    in Transaction mode. Required for Supavisor compatibility.
 *
 * 3. **Local Connection Pool**: Limits outbound connections from this app to 5,
 *    preventing overwhelming the Supabase pooler during traffic spikes.
 *
 * 4. **Global Singleton Pattern**: In development, reuses the same Prisma
 *    instance across hot reloads to prevent connection leaks.
 *
 * 5. **Idle Timeout**: Closes unused connections after 30s to free resources.
 *
 * ## Environment Variable Format
 *
 * DATABASE_URL must use Transaction mode format:
 * postgresql://user:pass@*.pooler.supabase.com:6543/postgres?pgbouncer=true
 *
 * @see https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler
 */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

/**
 * Global singleton storage to persist connections across hot reloads.
 * In production, each serverless instance gets its own pool.
 * In development, we reuse the pool to prevent "too many connections" errors.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient
  pool: Pool
}

/**
 * PostgreSQL connection pool configuration.
 *
 * These settings are tuned for Supabase's connection limits:
 * - Supabase Micro: 60 direct, 200 pooler connections
 * - We use 5 local connections to stay well under limits
 * - Multiple app instances can run without exhausting the pool
 */
const pool = globalForPrisma.pool || new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Required for Supabase SSL

  // Connection limits
  max: 5,                      // Max connections from this app instance
  min: 0,                      // Don't maintain idle connections in serverless

  // Timeouts (in milliseconds)
  idleTimeoutMillis: 30000,    // Close idle connections after 30s
  connectionTimeoutMillis: 10000, // Fail if can't connect in 10s

  // Statement timeout to prevent long-running queries
  statement_timeout: 30000,    // Kill queries running > 30s
})

// Persist pool in development to survive hot reloads
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.pool = pool
}

/**
 * Prisma adapter for pg Pool.
 * Allows Prisma to use our custom pool configuration instead of its default.
 */
const adapter = new PrismaPg(pool)

/**
 * Prisma Client instance.
 *
 * Usage:
 * ```typescript
 * import { prisma } from '@/lib/prisma'
 *
 * const users = await prisma.clients.findMany()
 * ```
 *
 * Note: Connections are managed automatically. You don't need to
 * call prisma.$connect() or prisma.$disconnect() in API routes.
 */
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ adapter })

// Persist Prisma client in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

/**
 * Raw database pool for direct SQL queries.
 *
 * Use sparingly - prefer Prisma's type-safe queries.
 * Only use for complex queries that Prisma can't express.
 *
 * Usage:
 * ```typescript
 * import { dbPool } from '@/lib/prisma'
 *
 * const result = await dbPool.query('SELECT NOW()')
 * ```
 */
export { pool as dbPool }

export default prisma
