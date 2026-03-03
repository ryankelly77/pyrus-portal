import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logAuthError } from '@/lib/alerts'
import { prisma, dbPool } from '@/lib/prisma'
import { enrollInAutomations } from '@/lib/email/automation-service'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/getting-started'
  const errorParam = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Check if provider returned an error
  if (errorParam) {
    console.error('Auth callback provider error:', errorParam, errorDescription)
    logAuthError(
      `Auth callback provider error: ${errorParam}`,
      'warning',
      { error: errorParam, errorDescription, next, step: 'provider_error' },
      'auth/callback/route.ts'
    )
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorParam)}`, requestUrl.origin))
  }

  try {
    if (code) {
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('Auth callback error:', error)
        logAuthError(
          `Auth callback failed: ${error.message}`,
          'warning',
          { error: error.message, next, step: 'exchange_code' },
          'auth/callback/route.ts'
        )
        return NextResponse.redirect(new URL('/login?error=auth_callback_failed', requestUrl.origin))
      }

      // Check for pending user_invite and apply role if found
      const appliedInvite = await applyPendingUserInvite(supabase).catch(() => null)

      // If an admin invite was applied, redirect to admin area
      if (appliedInvite?.applied && appliedInvite.role) {
        const adminRoles = ['super_admin', 'admin', 'production_team', 'sales']
        if (adminRoles.includes(appliedInvite.role)) {
          return NextResponse.redirect(new URL('/admin/dashboard', requestUrl.origin))
        }
      }

      // Track client login for automations (non-blocking)
      trackClientLogin(supabase).catch(console.error)
    }

    // Redirect to the next page (e.g., /reset-password)
    return NextResponse.redirect(new URL(next, requestUrl.origin))
  } catch (error) {
    console.error('Auth callback exception:', error)
    logAuthError(
      `Auth callback exception: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'warning',
      { error: error instanceof Error ? error.message : String(error), next, step: 'callback_handler' },
      'auth/callback/route.ts'
    )
    return NextResponse.redirect(new URL('/login?error=auth_callback_failed', requestUrl.origin))
  }
}

/**
 * Track client login for automation triggers
 */
async function trackClientLogin(supabase: Awaited<ReturnType<typeof createClient>>) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get user profile
    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Only track client logins (not admin logins)
    if (!profile || profile.role !== 'client' || !profile.client) {
      return
    }

    // Enroll in client_login automations
    await enrollInAutomations('client_login', {
      recipientEmail: profile.email,
      recipientName: profile.full_name || profile.email,
      triggerRecordType: 'profile',
      triggerRecordId: profile.id,
      contextData: {
        userId: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        clientId: profile.client.id,
        clientName: profile.client.name,
        loginAt: new Date().toISOString(),
      },
    })

    console.log(`Tracked client login for ${profile.email}`)
  } catch (error) {
    console.error('Failed to track client login:', error)
  }
}

/**
 * Check for pending user_invite by email and apply the role
 * This handles cases where users register through /register instead of /accept-invite
 * Returns { applied: true, role: string } if an invite was applied
 */
async function applyPendingUserInvite(supabase: Awaited<ReturnType<typeof createClient>>): Promise<{ applied: boolean; role?: string } | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return null

    // Check for pending user_invite
    const inviteResult = await dbPool.query(
      `SELECT id, role, client_ids, full_name FROM user_invites
       WHERE email = $1 AND status = 'pending' AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [user.email.toLowerCase()]
    )

    if (inviteResult.rows.length === 0) return { applied: false }

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
    return { applied: true, role: invite.role }
  } catch (error) {
    console.error('Failed to apply pending user_invite:', error)
    return null
  }
}
