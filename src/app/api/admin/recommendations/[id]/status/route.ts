// ============================================================
// Recommendation Status API
// ============================================================
//
// Changes the status of a recommendation.
// Valid transitions:
//   draft → sent (via invite API)
//   sent → accepted | declined | closed_lost
//   declined → sent (re-engagement)
//
// Status changes trigger score recalculation.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma, dbPool } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { triggerRecalculation } from '@/lib/pipeline/recalculate-score'

export const dynamic = 'force-dynamic'

type DealStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'closed_lost'

const VALID_STATUSES: DealStatus[] = ['draft', 'sent', 'accepted', 'declined', 'closed_lost']

// PATCH /api/admin/recommendations/[id]/status
// Updates the status of a recommendation
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth

    const { id } = await params
    const body = await request.json()
    const { status, reason } = body as { status: DealStatus; reason?: string }

    // Validate status
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    // Get current recommendation
    const recommendation = await prisma.recommendations.findUnique({
      where: { id },
      select: { id: true, status: true, created_by: true },
    })

    if (!recommendation) {
      return NextResponse.json(
        { error: 'Recommendation not found' },
        { status: 404 }
      )
    }

    // For non-admin roles, verify ownership
    if (!['super_admin', 'admin'].includes(profile.role)) {
      if (recommendation.created_by !== user.id) {
        return NextResponse.json(
          { error: 'You can only modify your own recommendations' },
          { status: 403 }
        )
      }
    }

    // Validate status transitions
    const currentStatus = recommendation.status as DealStatus
    const validTransitions: Record<DealStatus, DealStatus[]> = {
      draft: ['sent'], // Use invite API to go to sent
      sent: ['accepted', 'declined', 'closed_lost'],
      accepted: [], // Terminal state
      declined: ['sent', 'closed_lost'], // Can re-engage or close
      closed_lost: [], // Terminal state
    }

    if (!validTransitions[currentStatus]?.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${currentStatus} to ${status}` },
        { status: 400 }
      )
    }

    // Update using raw SQL to handle new columns not yet in Prisma schema
    const closedLostAt = status === 'closed_lost' ? new Date() : null
    const closedLostReason = status === 'closed_lost' ? (reason || null) : null

    const result = await dbPool.query(
      `UPDATE recommendations
       SET status = $1,
           updated_at = NOW(),
           closed_lost_at = $2,
           closed_lost_reason = $3
       WHERE id = $4
       RETURNING id, status, closed_lost_at, closed_lost_reason, confidence_score, updated_at`,
      [status, closedLostAt, closedLostReason, id]
    )

    const updated = result.rows[0]

    // Add history entry
    const userName = profile.role === 'super_admin' || profile.role === 'admin'
      ? 'Admin'
      : 'Sales Rep'

    try {
      await prisma.recommendation_history.create({
        data: {
          recommendation_id: id,
          action: `Status changed to ${status}`,
          details: reason
            ? `Changed by ${userName}. Reason: ${reason}`
            : `Changed by ${userName}`,
          created_by: user.id,
        },
      })
    } catch (historyError) {
      console.error('Failed to create history entry:', historyError)
    }

    // Trigger score recalculation (handles terminal states internally)
    triggerRecalculation(id, 'status_changed').catch(console.error)

    return NextResponse.json({
      recommendation: {
        id: updated.id,
        status: updated.status,
        closedLostAt: updated.closed_lost_at,
        closedLostReason: updated.closed_lost_reason,
        confidenceScore: updated.confidence_score,
        updatedAt: updated.updated_at,
      },
    })
  } catch (error) {
    console.error('Failed to update recommendation status:', error)
    return NextResponse.json(
      { error: 'Failed to update status' },
      { status: 500 }
    )
  }
}

// GET /api/admin/recommendations/[id]/status
// Returns current status and available transitions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { id } = await params

    // Use raw SQL to handle new columns not yet in Prisma schema
    const result = await dbPool.query(
      `SELECT id, status, closed_lost_at, closed_lost_reason, confidence_score
       FROM recommendations
       WHERE id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Recommendation not found' },
        { status: 404 }
      )
    }

    const recommendation = result.rows[0]
    const currentStatus = recommendation.status as DealStatus

    const validTransitions: Record<DealStatus, DealStatus[]> = {
      draft: ['sent'],
      sent: ['accepted', 'declined', 'closed_lost'],
      accepted: [],
      declined: ['sent', 'closed_lost'],
      closed_lost: [],
    }

    return NextResponse.json({
      status: currentStatus,
      availableTransitions: validTransitions[currentStatus] || [],
      closedLostAt: recommendation.closed_lost_at,
      closedLostReason: recommendation.closed_lost_reason,
      confidenceScore: recommendation.confidence_score,
    })
  } catch (error) {
    console.error('Failed to fetch recommendation status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch status' },
      { status: 500 }
    )
  }
}
