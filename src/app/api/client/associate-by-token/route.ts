import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dbPool } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST /api/client/associate-by-token - Associate user with client using invite token
// This handles cases where users register with a different email than the invite was sent to
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    // Look up the client from the recommendation_invites table using the token
    const inviteResult = await dbPool.query(
      `SELECT ri.id as invite_id, r.client_id, c.name as client_name
       FROM recommendation_invites ri
       JOIN recommendations r ON r.id = ri.recommendation_id
       JOIN clients c ON c.id = r.client_id
       WHERE ri.token = $1
       LIMIT 1`,
      [token]
    )

    if (inviteResult.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired invite token' }, { status: 404 })
    }

    const { client_id: clientId, client_name: clientName } = inviteResult.rows[0]

    // Associate the user with this client using UPSERT
    await dbPool.query(
      `INSERT INTO profiles (id, client_id, email, full_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET client_id = $2`,
      [user.id, clientId, user.email, user.user_metadata?.full_name || user.email?.split('@')[0] || 'User']
    )

    // Mark the invite as viewed
    await dbPool.query(
      `UPDATE recommendation_invites SET viewed_at = NOW(), status = 'viewed' WHERE token = $1`,
      [token]
    )

    console.log(`Associated user ${user.email} with client ${clientName} (${clientId}) via token`)

    return NextResponse.json({
      success: true,
      clientId,
      clientName,
      message: `Successfully linked to ${clientName}`
    })
  } catch (error) {
    console.error('Error associating user by token:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
