import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dbPool } from '@/lib/prisma'
import { logAuthError } from '@/lib/alerts'

export const dynamic = 'force-dynamic'

// GET /api/auth/me - Get current user's profile info
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      logAuthError(
        `Profile fetch failed: Auth error - ${authError.message}`,
        'warning',
        { error: authError.message, step: 'get_user' },
        'auth/me/route.ts'
      )
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get profile info
    const profileResult = await dbPool.query(
      `SELECT id, email, full_name, role, client_id FROM profiles WHERE id = $1`,
      [user.id]
    )

    if (profileResult.rows.length === 0) {
      logAuthError(
        'Profile fetch failed: Profile not found',
        'warning',
        { userId: user.id, step: 'fetch_profile' },
        'auth/me/route.ts'
      )
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const profile = profileResult.rows[0]

    return NextResponse.json({
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      role: profile.role,
      clientId: profile.client_id,
    })
  } catch (error) {
    console.error('Error fetching user info:', error)
    logAuthError(
      `Profile fetch exception: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'warning',
      { error: error instanceof Error ? error.message : String(error), step: 'me_handler' },
      'auth/me/route.ts'
    )
    return NextResponse.json(
      { error: 'Failed to fetch user info' },
      { status: 500 }
    )
  }
}
