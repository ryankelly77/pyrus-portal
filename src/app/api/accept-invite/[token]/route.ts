import { NextRequest, NextResponse } from 'next/server'
import { dbPool } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Lazy initialize Supabase admin client for user creation
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

// GET /api/accept-invite/[token] - Validate invite and return data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Find the invite
    const result = await dbPool.query(
      `SELECT id, email, full_name, role, client_ids, expires_at, status
       FROM user_invites
       WHERE invite_token = $1`,
      [token]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    const invite = result.rows[0]

    // Check if already accepted
    if (invite.status === 'accepted') {
      return NextResponse.json(
        { error: 'This invitation has already been used' },
        { status: 400 }
      )
    }

    // Check if expired
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 400 }
      )
    }

    // Check if email failed
    if (invite.status === 'email_failed') {
      return NextResponse.json(
        { error: 'This invitation could not be delivered' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      invite: {
        id: invite.id,
        email: invite.email,
        fullName: invite.full_name,
        role: invite.role,
        clientIds: invite.client_ids || [],
        expiresAt: invite.expires_at,
      }
    })
  } catch (error) {
    console.error('Error fetching invite:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invitation' },
      { status: 500 }
    )
  }
}

// POST /api/accept-invite/[token] - Accept invite and create account
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { password } = body

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Check for basic password complexity (Supabase may require this)
    const hasUppercase = /[A-Z]/.test(password)
    const hasLowercase = /[a-z]/.test(password)
    const hasNumber = /[0-9]/.test(password)

    if (!hasUppercase || !hasLowercase || !hasNumber) {
      return NextResponse.json(
        { error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' },
        { status: 400 }
      )
    }

    // Find and validate the invite
    const inviteResult = await dbPool.query(
      `SELECT id, email, full_name, phone, role, client_ids, expires_at, status
       FROM user_invites
       WHERE invite_token = $1`,
      [token]
    )

    if (inviteResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    const invite = inviteResult.rows[0]

    // Validate invite status
    if (invite.status === 'accepted') {
      return NextResponse.json(
        { error: 'This invitation has already been used' },
        { status: 400 }
      )
    }

    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await dbPool.query(
      'SELECT id FROM profiles WHERE email = $1',
      [invite.email.toLowerCase()]
    )

    if (existingUser.rows.length > 0) {
      // Mark invite as accepted since user exists
      await dbPool.query(
        `UPDATE user_invites SET status = 'accepted', accepted_at = NOW() WHERE id = $1`,
        [invite.id]
      )
      return NextResponse.json(
        { error: 'An account with this email already exists. Please log in instead.' },
        { status: 400 }
      )
    }

    // Create user in Supabase Auth
    let supabaseAdmin
    try {
      supabaseAdmin = getSupabaseAdmin()
    } catch (configError) {
      console.error('Supabase admin config error:', configError)
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Log the data being sent to Supabase for debugging
    console.log('Creating Supabase user with:', {
      email: invite.email,
      emailLength: invite.email?.length,
      emailTrimmed: invite.email?.trim(),
      fullName: invite.full_name,
      passwordLength: password?.length
    })

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: invite.email.trim().toLowerCase(),
      password: password,
      email_confirm: true, // Auto-confirm since they came from invite
      user_metadata: {
        full_name: invite.full_name,
      }
    })

    if (authError || !authData.user) {
      console.error('Failed to create auth user:', authError)
      console.error('Auth error details:', JSON.stringify(authError, null, 2))
      return NextResponse.json(
        { error: authError?.message || 'Failed to create account' },
        { status: 500 }
      )
    }

    const userId = authData.user.id

    // Create profile
    // For users with client access, use the first client_id as the primary/active client
    const clientIds = invite.client_ids || []
    const primaryClientId = clientIds.length > 0 ? clientIds[0] : null

    try {
      // Use upsert to handle case where Supabase trigger already created profile
      await dbPool.query(
        `INSERT INTO profiles (id, email, full_name, role, client_id, active_client_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $5, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET
           email = EXCLUDED.email,
           full_name = EXCLUDED.full_name,
           role = EXCLUDED.role,
           client_id = EXCLUDED.client_id,
           active_client_id = EXCLUDED.active_client_id,
           updated_at = NOW()`,
        [
          userId,
          invite.email.trim().toLowerCase(),
          invite.full_name,
          invite.role,
          primaryClientId
        ]
      )

      // Create client_users entries for all linked clients (for any role)
      for (let i = 0; i < clientIds.length; i++) {
        const clientId = clientIds[i]
        const isPrimary = i === 0
        await dbPool.query(
          `INSERT INTO client_users (client_id, user_id, role, is_primary, receives_alerts, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
           ON CONFLICT (client_id, user_id) DO NOTHING`,
          [
            clientId,
            userId,
            'member',
            isPrimary,
            true // Default to receiving alerts
          ]
        )
      }
    } catch (profileError) {
      const errorMessage = profileError instanceof Error ? profileError.message : String(profileError)
      console.error('Failed to create profile:', errorMessage)
      // User was created in auth but profile failed - try to clean up
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {})
      return NextResponse.json(
        { error: `Failed to create user profile: ${errorMessage}` },
        { status: 500 }
      )
    }

    // Mark invite as accepted
    await dbPool.query(
      `UPDATE user_invites SET status = 'accepted', accepted_at = NOW() WHERE id = $1`,
      [invite.id]
    )

    // Log activity (non-blocking)
    try {
      await dbPool.query(
        `INSERT INTO activity_log (user_id, activity_type, description, metadata)
         VALUES ($1, $2, $3, $4)`,
        [
          userId,
          'accepted_invite',
          `${invite.full_name} accepted invitation as ${invite.role}`,
          JSON.stringify({
            email: invite.email,
            role: invite.role,
            invite_id: invite.id
          })
        ]
      )
    } catch (logError) {
      console.error('Failed to log activity (non-critical):', logError)
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
    })
  } catch (error) {
    console.error('Error accepting invite:', error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}
