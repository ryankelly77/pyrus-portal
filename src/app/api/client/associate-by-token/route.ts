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

    console.log('associate-by-token called, user:', user?.email)

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { token } = await request.json()
    console.log('Token received:', token)

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    // Look up the client from the recommendation_invites table using the token
    console.log('Looking up invite with token:', token)
    const inviteResult = await dbPool.query(
      `SELECT ri.id as invite_id, ri.email as invite_email, ri.invite_token, r.client_id, c.name as client_name, c.contact_email
       FROM recommendation_invites ri
       JOIN recommendations r ON r.id = ri.recommendation_id
       JOIN clients c ON c.id = r.client_id
       WHERE ri.invite_token = $1
       LIMIT 1`,
      [token]
    )
    console.log('Invite lookup result:', inviteResult.rows.length, 'rows')

    if (inviteResult.rows.length === 0) {
      // Debug: check if token exists at all
      const debugResult = await dbPool.query(
        `SELECT invite_token, email FROM recommendation_invites ORDER BY created_at DESC LIMIT 5`
      )
      console.log('Recent invite tokens:', debugResult.rows)
      return NextResponse.json({ error: 'Invalid or expired invite token' }, { status: 404 })
    }

    const { client_id: clientId, client_name: clientName, invite_email: inviteEmail, contact_email: currentContactEmail } = inviteResult.rows[0]

    // Associate the user with this client using UPSERT
    await dbPool.query(
      `INSERT INTO profiles (id, client_id, email, full_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET client_id = $2`,
      [user.id, clientId, user.email, user.user_metadata?.full_name || user.email?.split('@')[0] || 'User']
    )

    // Update client contact_email if user registered with a different email
    // Only update if the current contact_email matches the invite email (was their personal email)
    // or if there's no contact_email set
    if (user.email && user.email.toLowerCase() !== inviteEmail?.toLowerCase()) {
      const shouldUpdateEmail = !currentContactEmail || currentContactEmail.toLowerCase() === inviteEmail?.toLowerCase()
      if (shouldUpdateEmail) {
        await dbPool.query(
          `UPDATE clients SET contact_email = $1 WHERE id = $2`,
          [user.email, clientId]
        )
        console.log(`Updated client contact_email from ${currentContactEmail || 'null'} to ${user.email}`)
      }
    }

    // Mark the invite as viewed
    await dbPool.query(
      `UPDATE recommendation_invites SET viewed_at = NOW(), status = 'viewed' WHERE invite_token = $1`,
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
