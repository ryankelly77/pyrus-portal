import { NextRequest, NextResponse } from 'next/server'
import { dbPool } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

interface RouteParams {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

// GET /api/admin/clients/[id]/smart-recommendations/history - Get full history of smart recommendations
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdmin()
    if ((auth as any)?.user === undefined) return auth as any
    const { id: clientId } = await params

    // Get the recommendation ID for this client
    const recResult = await dbPool.query(
      `SELECT id FROM smart_recommendations WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [clientId]
    )

    if (recResult.rows.length === 0) {
      return NextResponse.json({ history: [] })
    }

    const recommendationId = recResult.rows[0].id

    // Get history with product names and user info
    const historyResult = await dbPool.query(
      `SELECT
        srh.id,
        srh.item_id,
        srh.product_id,
        srh.action,
        srh.details,
        srh.created_at,
        srh.created_by,
        p.name as product_name,
        prof.email as created_by_email,
        c.name as client_name
       FROM smart_recommendation_history srh
       LEFT JOIN products p ON p.id = srh.product_id
       LEFT JOIN profiles prof ON prof.id = srh.created_by
       LEFT JOIN clients c ON c.id = (SELECT client_id FROM profiles WHERE id = srh.created_by)
       WHERE srh.recommendation_id = $1
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
      createdBy: row.created_by,
      createdByEmail: row.created_by_email,
      clientName: row.client_name,
    }))

    return NextResponse.json({ history })
  } catch (error) {
    console.error('Error fetching smart recommendation history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recommendation history' },
      { status: 500 }
    )
  }
}
