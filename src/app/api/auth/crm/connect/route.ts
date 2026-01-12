import { NextRequest, NextResponse } from 'next/server'

/**
 * HighLevel OAuth Connect Endpoint
 *
 * Redirects to HighLevel's OAuth consent page to initiate the connection flow.
 *
 * Usage: Navigate to /api/auth/highlevel/connect
 *
 * Required scopes for conversations/messages:
 * - conversations.readonly
 * - conversations.write
 * - conversations/message.readonly
 * - conversations/message.write
 * - contacts.readonly
 */

const HIGHLEVEL_AUTH_URL = 'https://marketplace.gohighlevel.com/oauth/chooselocation'

export async function GET(request: NextRequest) {
  const clientId = process.env.HIGHLEVEL_CLIENT_ID
  const redirectUri = process.env.HIGHLEVEL_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      {
        error: 'HighLevel OAuth not configured',
        message: 'Please set HIGHLEVEL_CLIENT_ID and HIGHLEVEL_REDIRECT_URI environment variables',
      },
      { status: 500 }
    )
  }

  // Scopes needed for conversations and messages
  const scopes = [
    'conversations.readonly',
    'conversations.write',
    'conversations/message.readonly',
    'conversations/message.write',
    'contacts.readonly',
  ].join(' ')

  // Build OAuth authorization URL
  const authUrl = new URL(HIGHLEVEL_AUTH_URL)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', scopes)

  // Redirect to HighLevel OAuth consent page
  return NextResponse.redirect(authUrl.toString())
}
