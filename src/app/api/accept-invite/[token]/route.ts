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

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: invite.email,
      password: password,
      email_confirm: true, // Auto-confirm since they came from invite
      user_metadata: {
        full_name: invite.full_name,
      }
    })

    if (authError || !authData.user) {
      console.error('Failed to create auth user:', authError)
      return NextResponse.json(
        { error: authError?.message || 'Failed to create account' },
        { status: 500 }
      )
    }

    const userId = authData.user.id

    // Create profile
    // For client users, use the first client_id; for admins, no client_id
    const clientId = invite.role === 'client' && invite.client_ids?.length > 0
      ? invite.client_ids[0]
      : null

    try {
      await dbPool.query(
        `INSERT INTO profiles (id, email, full_name, role, client_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [
          userId,
          invite.email.toLowerCase(),
          invite.full_name,
          invite.role,
          clientId
        ]
      )
    } catch (profileError) {
      console.error('Failed to create profile:', profileError)
      // User was created in auth but profile failed - try to clean up
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {})
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      )
    }

    // If client user has multiple clients, we might need to handle that separately
    // For now, primary client is set in profile

    // Mark invite as accepted
    await dbPool.query(
      `UPDATE user_invites SET status = 'accepted', accepted_at = NOW() WHERE id = $1`,
      [invite.id]
    )

    // Log activity
    await dbPool.query(
      `INSERT INTO activity_log (profile_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        userId,
        'accepted_invite',
        'user_invite',
        invite.id,
        JSON.stringify({
          email: invite.email,
          role: invite.role,
        })
      ]
    )

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
