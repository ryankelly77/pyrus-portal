import { NextRequest, NextResponse } from 'next/server'
import { dbPool } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

// GET /api/admin/scheduled-cancellations - Get subscription items with term end dates
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if ((auth as any)?.user === undefined) return auth as any

    // Query subscription items with term_end_date set
    const result = await dbPool.query(`
      SELECT
        si.id,
        si.subscription_id,
        si.product_id,
        si.term_end_date,
        si.unit_amount,
        si.created_at,
        p.name as product_name,
        p.billing_term_months,
        c.id as client_id,
        c.name as client_name
      FROM subscription_items si
      JOIN products p ON p.id = si.product_id
      JOIN subscriptions s ON s.id = si.subscription_id
      JOIN clients c ON c.id = s.client_id
      WHERE si.term_end_date IS NOT NULL
        AND si.term_end_date > NOW()
        AND s.status = 'active'
      ORDER BY si.term_end_date ASC
    `)

    // Calculate months remaining and format data
    const now = new Date()
    const items = result.rows.map(row => {
      const termEndDate = new Date(row.term_end_date)
      const monthsRemaining = Math.max(0, Math.floor((termEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)))

      return {
        id: row.id,
        subscriptionId: row.subscription_id,
        productId: row.product_id,
        productName: row.product_name,
        clientId: row.client_id,
        clientName: row.client_name,
        termEndDate: termEndDate.toISOString(),
        termEndDateFormatted: termEndDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        monthlyAmount: row.unit_amount ? row.unit_amount / 100 : 0,
        billingTermMonths: row.billing_term_months,
        monthsRemaining,
        createdAt: row.created_at,
      }
    })

    // Calculate summary stats
    const totalScheduledMRR = items.reduce((sum, item) => sum + item.monthlyAmount, 0)
    const itemsEndingSoon = items.filter(item => item.monthsRemaining <= 2).length

    return NextResponse.json({
      items,
      summary: {
        totalItems: items.length,
        totalScheduledMRR,
        itemsEndingSoon,
      },
    })
  } catch (error) {
    console.error('Failed to fetch scheduled cancellations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scheduled cancellations' },
      { status: 500 }
    )
  }
}
