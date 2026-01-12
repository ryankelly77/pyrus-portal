import { NextRequest, NextResponse } from 'next/server'
import { dbPool } from '@/lib/prisma'

/**
 * HighLevel OAuth Callback Handler
 *
 * This endpoint receives the authorization code from HighLevel after user consent
 * and exchanges it for access/refresh tokens.
 *
 * Flow:
 * 1. User clicks "Connect HighLevel" in admin
 * 2. Redirected to HighLevel OAuth consent page
 * 3. User approves, HighLevel redirects here with ?code=xxx
 * 4. We exchange code for tokens
 * 5. Store tokens in database
 * 6. Redirect back to admin with success message
 */

const HIGHLEVEL_TOKEN_URL = 'https://services.leadconnectorhq.com/oauth/token'

interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  scope: string
  userType: string
  locationId: string
  companyId?: string
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  // Handle OAuth errors
  if (error) {
    console.error('HighLevel OAuth error:', error)
    return NextResponse.redirect(
      new URL('/admin?error=highlevel_oauth_denied', request.url)
    )
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/admin?error=highlevel_oauth_no_code', request.url)
    )
  }

  // Check required environment variables
  const clientId = process.env.HIGHLEVEL_CLIENT_ID
  const clientSecret = process.env.HIGHLEVEL_CLIENT_SECRET
  const redirectUri = process.env.HIGHLEVEL_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    console.error('Missing HighLevel OAuth environment variables')
    return NextResponse.redirect(
      new URL('/admin?error=highlevel_oauth_config', request.url)
    )
  }

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch(HIGHLEVEL_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('HighLevel token exchange failed:', tokenResponse.status, errorText)
      return NextResponse.redirect(
        new URL('/admin?error=highlevel_oauth_token_failed', request.url)
      )
    }

    const tokens: TokenResponse = await tokenResponse.json()

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    // Store tokens in database (upsert - insert or update)
    await dbPool.query(
      `INSERT INTO highlevel_oauth (
        location_id, access_token, refresh_token, token_type,
        expires_at, scope, user_type, company_id, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (location_id)
      DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        token_type = EXCLUDED.token_type,
        expires_at = EXCLUDED.expires_at,
        scope = EXCLUDED.scope,
        user_type = EXCLUDED.user_type,
        company_id = EXCLUDED.company_id,
        updated_at = NOW()`,
      [
        tokens.locationId,
        tokens.access_token,
        tokens.refresh_token,
        tokens.token_type,
        expiresAt,
        tokens.scope,
        tokens.userType,
        tokens.companyId || null,
      ]
    )

    console.log('HighLevel OAuth tokens stored for location:', tokens.locationId)

    // Redirect back to admin with success
    return NextResponse.redirect(
      new URL('/admin?success=highlevel_connected', request.url)
    )

  } catch (error) {
    console.error('HighLevel OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/admin?error=highlevel_oauth_error', request.url)
    )
  }
}
