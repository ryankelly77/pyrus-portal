import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dbPool } from '@/lib/prisma'
import { transitionStatus } from '@/lib/content-workflow'

export const dynamic = 'force-dynamic'

// Transitions clients are allowed to make
const CLIENT_ALLOWED_TRANSITIONS: Record<string, string[]> = {
  sent_for_review: ['client_reviewing', 'approved'], // approved added for Quick Approve
  client_reviewing: ['approved', 'revisions_requested'],
}

// Admin roles that can make any transition
const ADMIN_ROLES = ['super_admin', 'admin', 'production_team', 'sales']

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contentId } = await params

    // 1. Authenticate the user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get user profile with role and client_id
    const profileResult = await dbPool.query(
      `SELECT id, full_name, role, client_id FROM profiles WHERE id = $1`,
      [user.id]
    )

    if (profileResult.rows.length === 0) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const profile = profileResult.rows[0]
    const isAdmin = ADMIN_ROLES.includes(profile.role)

    // 3. Parse request body
    const body = await request.json()
    const { targetStatus, note } = body

    if (!targetStatus) {
      return NextResponse.json({ error: 'targetStatus is required' }, { status: 400 })
    }

    // 4. Get the content piece to verify ownership and current status
    const contentResult = await dbPool.query(
      `SELECT id, status, client_id, approval_required FROM content WHERE id = $1`,
      [contentId]
    )

    if (contentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    const content = contentResult.rows[0]

    // 5. Authorization check
    if (!isAdmin) {
      // Client users must own the content
      if (content.client_id !== profile.client_id) {
        return NextResponse.json({ error: 'Content not found' }, { status: 404 })
      }

      // Client users can only make specific transitions
      const allowedTransitions = CLIENT_ALLOWED_TRANSITIONS[content.status] || []
      if (!allowedTransitions.includes(targetStatus)) {
        return NextResponse.json(
          { error: `You cannot transition from '${content.status}' to '${targetStatus}'` },
          { status: 403 }
        )
      }
    }

    // 6. Call transitionStatus from the workflow engine
    const result = await transitionStatus({
      contentPieceId: contentId,
      targetStatus,
      userId: user.id,
      userName: profile.full_name || user.email || 'Unknown',
      note: note || undefined,
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Transition error:', error)

    // Handle known error messages from the workflow engine
    if (error instanceof Error) {
      if (error.message.includes('Invalid transition')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
    }

    return NextResponse.json({ error: 'Failed to transition status' }, { status: 500 })
  }
}
