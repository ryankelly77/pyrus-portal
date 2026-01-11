import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dbPool } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/client/debug - Debug client association
// WARNING: This endpoint exposes sensitive data - disabled in production
export async function GET() {
  // Block access in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated', step: 'auth' }, { status: 401 })
    }

    const debug: Record<string, unknown> = {
      userId: user.id,
      userEmail: user.email,
      userMetadata: user.user_metadata,
    }

    // Check profile
    const profileResult = await dbPool.query(
      `SELECT id, email, client_id, full_name, role FROM profiles WHERE id = $1`,
      [user.id]
    )
    debug.profile = profileResult.rows[0] || null
    debug.profileExists = profileResult.rows.length > 0

    // Check if email matches any invites
    if (user.email) {
      const inviteResult = await dbPool.query(
        `SELECT ri.id, ri.email, ri.first_name, ri.last_name, r.client_id, c.name as client_name
         FROM recommendation_invites ri
         JOIN recommendations r ON r.id = ri.recommendation_id
         JOIN clients c ON c.id = r.client_id
         WHERE LOWER(ri.email) = LOWER($1)
         ORDER BY ri.created_at DESC`,
        [user.email]
      )
      debug.matchingInvites = inviteResult.rows
      debug.inviteCount = inviteResult.rows.length
    }

    // If profile has client_id, get client info
    if (profileResult.rows[0]?.client_id) {
      const clientResult = await dbPool.query(
        `SELECT id, name, contact_name, contact_email, status FROM clients WHERE id = $1`,
        [profileResult.rows[0].client_id]
      )
      debug.client = clientResult.rows[0] || null
    }

    return NextResponse.json(debug)
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
