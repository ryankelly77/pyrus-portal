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

    // Delete related records first (to handle foreign key constraints)
    try {
      // Delete activity logs by this user
      await dbPool.query('DELETE FROM activity_log WHERE user_id = $1', [userId])

      // Delete notifications for this user
      await dbPool.query('DELETE FROM notifications WHERE user_id = $1', [userId])

      // Delete user invites sent by this user (set invited_by to null)
      await dbPool.query('UPDATE user_invites SET invited_by = NULL WHERE invited_by = $1', [userId])

      // Delete password resets for this user
      await dbPool.query('DELETE FROM password_resets WHERE user_id = $1', [userId])

      // Unassign content assigned to this user
      await dbPool.query('UPDATE content SET assigned_to = NULL WHERE assigned_to = $1', [userId])
      await dbPool.query('UPDATE content SET author_id = NULL WHERE author_id = $1', [userId])

      // Delete content comments by this user
      await dbPool.query('DELETE FROM content_comments WHERE user_id = $1', [userId])

      // Delete content revisions by this user
      await dbPool.query('DELETE FROM content_revisions WHERE user_id = $1', [userId])

      // Update recommendations created by this user
      await dbPool.query('UPDATE recommendations SET created_by = NULL WHERE created_by = $1', [userId])
    } catch (cleanupError) {
      console.error('Error cleaning up related records:', cleanupError)
      // Continue with delete attempt
    }

    // Delete profile
    try {
      await dbPool.query('DELETE FROM profiles WHERE id = $1', [userId])
    } catch (deleteError) {
      const errorMessage = deleteError instanceof Error ? deleteError.message : String(deleteError)
      console.error('Failed to delete profile:', errorMessage)
      return NextResponse.json(
        { error: `Failed to delete user: ${errorMessage}` },
        { status: 500 }
      )
    }

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
