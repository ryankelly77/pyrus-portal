import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { dbPool } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/admin/clients/[id]/smart-recommendations/decline
// Admin endpoint for declining recommendations on behalf of a client (used in View as Client mode)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { user } = auth
    const { id: clientId } = await params
    const { itemId } = await request.json()

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 })
    }

    // Verify the item belongs to this client's recommendations
    const itemResult = await dbPool.query(
      `SELECT sri.id, sri.recommendation_id, sri.product_id, sr.client_id, p.name as product_name
       FROM smart_recommendation_items sri
       JOIN smart_recommendations sr ON sr.id = sri.recommendation_id
       JOIN products p ON p.id = sri.product_id
       WHERE sri.id = $1`,
      [itemId]
    )

    const item = itemResult.rows[0]

    if (!item) {
      return NextResponse.json({ error: 'Recommendation item not found' }, { status: 404 })
    }

    if (item.client_id !== clientId) {
      return NextResponse.json({ error: 'Item does not belong to this client' }, { status: 403 })
    }

    // Update the item status to declined
    await dbPool.query(
      `UPDATE smart_recommendation_items
       SET status = 'declined',
           status_changed_at = NOW(),
           status_changed_by = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [itemId, user.id]
    )

    // Get admin name/email for history
    const adminResult = await dbPool.query(
      `SELECT email, full_name FROM profiles WHERE id = $1`,
      [user.id]
    )
    const adminName = adminResult.rows[0]?.full_name || adminResult.rows[0]?.email || 'Admin'

    // Create history entry
    await dbPool.query(
      `INSERT INTO smart_recommendation_history
       (recommendation_id, item_id, product_id, action, details, created_by)
       VALUES ($1, $2, $3, 'declined', $4, $5)`,
      [
        item.recommendation_id,
        itemId,
        item.product_id,
        `${adminName} declined "${item.product_name}"`,
        user.id
      ]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error declining recommendation:', error)
    return NextResponse.json(
      { error: 'Failed to decline recommendation' },
      { status: 500 }
    )
  }
}
