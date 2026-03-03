import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dbPool } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/apply-user-invite
 * Check for pending user_invite by email and apply the role
 * This handles cases where users register through /register instead of /accept-invite
 */
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check for pending user_invite
    const inviteResult = await dbPool.query(
      `SELECT id, role, client_ids, full_name FROM user_invites
       WHERE email = $1 AND status = 'pending' AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [user.email.toLowerCase()]
    )

    if (inviteResult.rows.length === 0) {
      return NextResponse.json({ applied: false, message: 'No pending invite found' })
    }

    const invite = inviteResult.rows[0]
    const clientIds = invite.client_ids || []
    const primaryClientId = clientIds.length > 0 ? clientIds[0] : null

    // Update the profile with the correct role from the invite
    await dbPool.query(
      `UPDATE profiles SET
        role = $1,
        client_id = COALESCE($2, client_id),
        active_client_id = COALESCE($2, active_client_id),
        full_name = COALESCE(full_name, $3),
        updated_at = NOW()
       WHERE id = $4`,
      [invite.role, primaryClientId, invite.full_name, user.id]
    )

    // Create client_users entries if needed
    for (let i = 0; i < clientIds.length; i++) {
      const clientId = clientIds[i]
      await dbPool.query(
        `INSERT INTO client_users (client_id, user_id, role, is_primary, receives_alerts)
         VALUES ($1, $2, 'member', $3, true)
         ON CONFLICT (client_id, user_id) DO NOTHING`,
        [clientId, user.id, i === 0]
      )
    }

    // Mark invite as accepted
    await dbPool.query(
      `UPDATE user_invites SET status = 'accepted', accepted_at = NOW() WHERE id = $1`,
      [invite.id]
    )

    // Log activity
    await dbPool.query(
      `INSERT INTO activity_log (user_id, activity_type, description, metadata)
       VALUES ($1, $2, $3, $4)`,
      [
        user.id,
        'accepted_invite',
        `${invite.full_name || user.email} accepted invitation as ${invite.role}`,
        JSON.stringify({ email: user.email, role: invite.role, invite_id: invite.id })
      ]
    ).catch(() => {})

    console.log(`Applied pending user_invite for ${user.email} with role ${invite.role}`)

    return NextResponse.json({
      applied: true,
      role: invite.role,
      message: `Applied invite with role: ${invite.role}`
    })
  } catch (error) {
    console.error('Failed to apply user invite:', error)
    return NextResponse.json(
      { error: 'Failed to apply invite' },
      { status: 500 }
    )
  }
}
