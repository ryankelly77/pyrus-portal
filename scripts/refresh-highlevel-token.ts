/**
 * Script to manually refresh the HighLevel OAuth token
 *
 * Usage:
 *   HIGHLEVEL_CLIENT_ID=xxx HIGHLEVEL_CLIENT_SECRET=yyy npx tsx scripts/refresh-highlevel-token.ts
 */

import { Pool } from 'pg'

const HIGHLEVEL_TOKEN_URL = 'https://services.leadconnectorhq.com/oauth/token'

async function main() {
  const clientId = process.env.HIGHLEVEL_CLIENT_ID
  const clientSecret = process.env.HIGHLEVEL_CLIENT_SECRET
  const databaseUrl = process.env.DATABASE_URL

  if (!clientId || !clientSecret) {
    console.error('Missing HIGHLEVEL_CLIENT_ID or HIGHLEVEL_CLIENT_SECRET')
    console.log('\nUsage:')
    console.log('  HIGHLEVEL_CLIENT_ID=xxx HIGHLEVEL_CLIENT_SECRET=yyy DATABASE_URL=... npx tsx scripts/refresh-highlevel-token.ts')
    process.exit(1)
  }

  if (!databaseUrl) {
    console.error('Missing DATABASE_URL')
    process.exit(1)
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  })

  try {
    // Get current refresh token
    const result = await pool.query(
      'SELECT location_id, refresh_token, expires_at FROM highlevel_oauth LIMIT 1'
    )

    if (result.rows.length === 0) {
      console.error('No OAuth token found in database')
      process.exit(1)
    }

    const { location_id, refresh_token, expires_at } = result.rows[0]
    console.log('Location ID:', location_id)
    console.log('Current expiry:', new Date(expires_at).toISOString())
    console.log('Now:', new Date().toISOString())
    console.log('Expired:', new Date(expires_at) < new Date())

    console.log('\nRefreshing token...')

    const response = await fetch(HIGHLEVEL_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refresh_token,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Token refresh failed:', response.status, errorText)
      process.exit(1)
    }

    const data = await response.json()
    const newExpiresAt = new Date(Date.now() + data.expires_in * 1000)

    // Update database
    await pool.query(
      `UPDATE highlevel_oauth
       SET access_token = $1, refresh_token = $2, expires_at = $3, updated_at = NOW()
       WHERE location_id = $4`,
      [data.access_token, data.refresh_token, newExpiresAt, location_id]
    )

    console.log('\n✅ Token refreshed successfully!')
    console.log('New expiry:', newExpiresAt.toISOString())
  } finally {
    await pool.end()
  }
}

main().catch(console.error)
