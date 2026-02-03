import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dbPool } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/client/smart-recommendations/history - Get recommendation history for client
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    let clientId = searchParams.get('clientId')

    // If no clientId provided, get the current user's client
    if (!clientId) {
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

      const profileClientId = profileResult.rows[0]?.client_id

      if (!profileClientId) {
        return NextResponse.json({ error: 'No client associated with user' }, { status: 404 })
      }

      clientId = profileClientId
    }

    // Get the recommendation ID for this client
    const recResult = await dbPool.query(
      `SELECT id FROM smart_recommendations WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [clientId]
    )

    if (recResult.rows.length === 0) {
      return NextResponse.json({ history: [] })
    }

    const recommendationId = recResult.rows[0].id

    // Get history - only show client-relevant actions (declined, purchased)
    const historyResult = await dbPool.query(
      `SELECT
        srh.id,
        srh.item_id,
        srh.product_id,
        srh.action,
        srh.details,
        srh.created_at,
        p.name as product_name
       FROM smart_recommendation_history srh
       LEFT JOIN products p ON p.id = srh.product_id
       WHERE srh.recommendation_id = $1
         AND srh.action IN ('declined', 'purchased')
       ORDER BY srh.created_at DESC`,
      [recommendationId]
    )

    const history = historyResult.rows.map(row => ({
      id: row.id,
      itemId: row.item_id,
      productId: row.product_id,
      productName: row.product_name,
      action: row.action,
      details: row.details,
      createdAt: row.created_at,
    }))

    return NextResponse.json({ history })
  } catch (error) {
    console.error('Error fetching client recommendation history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recommendation history' },
      { status: 500 }
    )
  }
}
