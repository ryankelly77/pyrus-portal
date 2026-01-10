import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dbPool } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST /api/client/associate - Associate a user with a client after registration
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { clientId, token } = await request.json()

    if (!clientId || !token) {
      return NextResponse.json({ error: 'clientId and token are required' }, { status: 400 })
    }

    // Verify the token is valid for this client
    const inviteResult = await dbPool.query(
      `SELECT ri.id, ri.recommendation_id, r.client_id
       FROM recommendation_invites ri
       JOIN recommendations r ON r.id = ri.recommendation_id
       WHERE ri.invite_token = $1 AND r.client_id = $2`,
      [token, clientId]
    )

    if (inviteResult.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid token or client' }, { status: 400 })
    }

    // Update or insert the user's profile to associate with this client
    // Use UPSERT in case the profile hasn't been created yet by the trigger
    await dbPool.query(
      `INSERT INTO profiles (id, client_id, email, full_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET client_id = $2`,
      [user.id, clientId, user.email, user.user_metadata?.full_name || user.email?.split('@')[0] || 'User']
    )

    // Also update the client's primary contact email if not set
    await dbPool.query(
      `UPDATE clients
       SET contact_email = COALESCE(contact_email, $1)
       WHERE id = $2 AND contact_email IS NULL`,
      [user.email, clientId]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error associating client:', error)
    return NextResponse.json({ error: 'Failed to associate client' }, { status: 500 })
  }
}
