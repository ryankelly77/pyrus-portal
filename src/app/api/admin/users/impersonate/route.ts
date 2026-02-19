import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { dbPool } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic'

// POST /api/admin/users/impersonate - Start impersonation
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { profile } = auth

    // Only super_admin can impersonate
    if (profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only super admins can impersonate users' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Verify the target user exists and is a client user
    const userResult = await dbPool.query(
      `SELECT id, full_name, email, client_id, role
       FROM profiles
       WHERE id = $1`,
      [userId]
    )

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const targetUser = userResult.rows[0]

    // Don't allow impersonating admin users
    if (['super_admin', 'admin', 'production_team', 'sales'].includes(targetUser.role)) {
      return NextResponse.json(
        { error: 'Cannot impersonate admin users' },
        { status: 403 }
      )
    }

    // Set impersonation cookie
    const cookieStore = await cookies()
    cookieStore.set('impersonating_user_id', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 4, // 4 hours max
    })
    cookieStore.set('impersonating_user_name', targetUser.full_name || targetUser.email, {
      httpOnly: false, // Allow client-side access for banner
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 4,
    })
    cookieStore.set('impersonating_admin_id', auth.user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 4,
    })

    return NextResponse.json({
      success: true,
      user: {
        id: targetUser.id,
        name: targetUser.full_name || targetUser.email,
        clientId: targetUser.client_id,
      },
    })
  } catch (error) {
    console.error('Error starting impersonation:', error)
    return NextResponse.json(
      { error: 'Failed to start impersonation' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/users/impersonate - Stop impersonation
export async function DELETE() {
  try {
    const cookieStore = await cookies()

    // Clear impersonation cookies
    cookieStore.delete('impersonating_user_id')
    cookieStore.delete('impersonating_user_name')
    cookieStore.delete('impersonating_admin_id')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error stopping impersonation:', error)
    return NextResponse.json(
      { error: 'Failed to stop impersonation' },
      { status: 500 }
    )
  }
}
