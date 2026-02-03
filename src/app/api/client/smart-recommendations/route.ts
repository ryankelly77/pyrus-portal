import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dbPool } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

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

      clientId = profileResult.rows[0]?.client_id

      if (!clientId) {
        return NextResponse.json({ error: 'No client associated with this user' }, { status: 403 })
      }
    }

    // Get published smart recommendations for this client
    const recommendationResult = await dbPool.query(
      `SELECT
        sr.id,
        sr.status,
        sr.published_at,
        sr.next_refresh_at
      FROM smart_recommendations sr
      WHERE sr.client_id = $1
        AND sr.status = 'published'
      ORDER BY sr.published_at DESC
      LIMIT 1`,
      [clientId]
    )

    const recommendation = recommendationResult.rows[0]

    if (!recommendation) {
      return NextResponse.json({ recommendation: null, items: [] })
    }

    // Get the recommendation items with product details (only active items for clients)
    const itemsResult = await dbPool.query(
      `SELECT
        sri.id,
        sri.product_id,
        sri.priority,
        sri.why_note,
        sri.is_featured,
        sri.price_option,
        sri.coupon_code,
        sri.created_at,
        p.name as product_name,
        p.short_description,
        p.long_description,
        p.category,
        p.monthly_price,
        p.onetime_price
      FROM smart_recommendation_items sri
      JOIN products p ON p.id = sri.product_id
      WHERE sri.recommendation_id = $1
        AND (sri.status = 'active' OR sri.status IS NULL)
      ORDER BY sri.priority ASC`,
      [recommendation.id]
    )

    const items = itemsResult.rows.map(row => ({
      id: row.id,
      product_id: row.product_id,
      priority: row.priority,
      why_note: row.why_note,
      is_featured: row.is_featured,
      price_option: row.price_option,
      coupon_code: row.coupon_code,
      created_at: row.created_at,
      product: {
        id: row.product_id,
        name: row.product_name,
        short_description: row.short_description,
        long_description: row.long_description,
        category: row.category,
        monthly_price: row.monthly_price,
        onetime_price: row.onetime_price,
      }
    }))

    return NextResponse.json({
      recommendation: {
        id: recommendation.id,
        status: recommendation.status,
        published_at: recommendation.published_at,
        next_refresh_at: recommendation.next_refresh_at,
      },
      items
    })
  } catch (error) {
    console.error('Error fetching smart recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch smart recommendations' },
      { status: 500 }
    )
  }
}
