import { NextRequest, NextResponse } from 'next/server'
import { dbPool } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic'

// DELETE /api/admin/users/invite/[id] - Delete a pending invitation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { id } = await params

    // Find the invite first
    const inviteResult = await dbPool.query(
      `SELECT id, status FROM user_invites WHERE id = $1`,
      [id]
    )

    if (inviteResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    const invite = inviteResult.rows[0]

    // Don't allow deleting accepted invites
    if (invite.status === 'accepted') {
      return NextResponse.json(
        { error: 'Cannot delete an accepted invitation' },
        { status: 400 }
      )
    }

    // Delete the invite
    await dbPool.query(
      `DELETE FROM user_invites WHERE id = $1`,
      [id]
    )

    return NextResponse.json({
      success: true,
      message: 'Invitation deleted',
    })

  } catch (error) {
    console.error('Error deleting invitation:', error)
    return NextResponse.json(
      { error: 'Failed to delete invitation' },
      { status: 500 }
    )
  }
}
