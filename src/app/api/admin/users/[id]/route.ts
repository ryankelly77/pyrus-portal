import { NextRequest, NextResponse } from 'next/server'
import { dbPool } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Initialize Supabase Admin client
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

// DELETE /api/admin/users/[id] - Delete a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    // Only super_admin can delete users
    if (auth.profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only super admins can delete users' },
        { status: 403 }
      )
    }

    const { id: userId } = await params

    // Can't delete yourself
    if (userId === auth.user.id) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      )
    }

    // Get user info first
    const userResult = await dbPool.query(
      'SELECT id, email, full_name, role FROM profiles WHERE id = $1',
      [userId]
    )

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const targetUser = userResult.rows[0]

    // Delete from Supabase Auth
    try {
      const supabaseAdmin = getSupabaseAdmin()
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (authError) {
        console.error('Failed to delete auth user:', authError)
        // Continue anyway - profile delete is more important
      }
    } catch (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError)
    }

    // Delete profile (this will cascade delete related records based on DB constraints)
    await dbPool.query('DELETE FROM profiles WHERE id = $1', [userId])

    // Log activity
    try {
      await dbPool.query(
        `INSERT INTO activity_log (user_id, activity_type, description, metadata)
         VALUES ($1, $2, $3, $4)`,
        [
          auth.user.id,
          'deleted_user',
          `Deleted user ${targetUser.full_name || targetUser.email}`,
          JSON.stringify({
            deleted_user_id: userId,
            deleted_user_email: targetUser.email,
            deleted_user_role: targetUser.role
          })
        ]
      )
    } catch (logError) {
      console.error('Failed to log activity:', logError)
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/users/[id] - Update user (change role, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    // Only super_admin can modify users
    if (auth.profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only super admins can modify users' },
        { status: 403 }
      )
    }

    const { id: userId } = await params
    const body = await request.json()
    const { role } = body

    // Can't modify yourself
    if (userId === auth.user.id) {
      return NextResponse.json(
        { error: 'You cannot modify your own account here' },
        { status: 400 }
      )
    }

    // Validate role if provided
    const validRoles = ['client', 'admin', 'super_admin', 'production_team', 'sales']
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Get current user info
    const userResult = await dbPool.query(
      'SELECT id, email, full_name, role FROM profiles WHERE id = $1',
      [userId]
    )

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const targetUser = userResult.rows[0]

    // Update role if provided
    if (role) {
      await dbPool.query(
        'UPDATE profiles SET role = $1, updated_at = NOW() WHERE id = $2',
        [role, userId]
      )
    }

    // Log activity
    try {
      await dbPool.query(
        `INSERT INTO activity_log (user_id, activity_type, description, metadata)
         VALUES ($1, $2, $3, $4)`,
        [
          auth.user.id,
          'updated_user',
          `Updated user ${targetUser.full_name || targetUser.email}`,
          JSON.stringify({
            user_id: userId,
            changes: { role: { from: targetUser.role, to: role } }
          })
        ]
      )
    } catch (logError) {
      console.error('Failed to log activity:', logError)
    }

    return NextResponse.json({
      success: true,
      message: 'User updated successfully'
    })

  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}
