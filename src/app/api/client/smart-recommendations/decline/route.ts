import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dbPool } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { itemId } = await request.json()

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 })
    }

    // Get the current user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get profile with client_id
    const profileResult = await dbPool.query(
      `SELECT client_id FROM profiles WHERE id = $1`,
      [user.id]
    )

    const clientId = profileResult.rows[0]?.client_id

    if (!clientId) {
      return NextResponse.json({ error: 'No client associated with this user' }, { status: 403 })
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
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

    // Create history entry
    await dbPool.query(
      `INSERT INTO smart_recommendation_history
       (recommendation_id, item_id, product_id, action, details, created_by)
       VALUES ($1, $2, $3, 'declined', $4, $5)`,
      [
        item.recommendation_id,
        itemId,
        item.product_id,
        `Client declined "${item.product_name}"`,
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
