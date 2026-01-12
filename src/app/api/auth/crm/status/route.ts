import { NextResponse } from 'next/server'
import { dbPool } from '@/lib/prisma'

/**
 * HighLevel OAuth Status Endpoint
 *
 * Returns the current OAuth connection status for HighLevel integration.
 */

export async function GET() {
  const locationId = process.env.HIGHLEVEL_LOCATION_ID

  if (!locationId) {
    return NextResponse.json({
      connected: false,
      message: 'HighLevel location ID not configured',
    })
  }

  try {
    const result = await dbPool.query(
      `SELECT location_id, expires_at, scope, updated_at
       FROM highlevel_oauth
       WHERE location_id = $1`,
      [locationId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({
        connected: false,
        locationId,
        message: 'Not connected - OAuth authorization needed',
        connectUrl: '/api/auth/crm/connect',
      })
    }

    const token = result.rows[0]
    const isExpired = new Date(token.expires_at) < new Date()

    return NextResponse.json({
      connected: !isExpired,
      locationId: token.location_id,
      expiresAt: token.expires_at,
      scope: token.scope,
      updatedAt: token.updated_at,
      isExpired,
      message: isExpired
        ? 'Token expired - refresh needed'
        : 'Connected and ready',
    })
  } catch (error) {
    console.error('Error checking HighLevel OAuth status:', error)
    return NextResponse.json({
      connected: false,
      error: 'Database error checking OAuth status',
    })
  }
}
