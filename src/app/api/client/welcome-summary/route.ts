import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dbPool } from '@/lib/prisma'
import { getClientActivity } from '@/lib/services/activityService'
import { getSubscriptionData } from '@/lib/services/subscriptionService'

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

      const profileClientId = profileResult.rows[0]?.client_id

      if (!profileClientId) {
        return NextResponse.json({ error: 'No client associated with user' }, { status: 404 })
      }

      clientId = profileClientId
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!clientId || !uuidRegex.test(clientId)) {
      return NextResponse.json({ error: 'Invalid client ID format' }, { status: 400 })
    }

    // Fetch client data
    const clientResult = await dbPool.query(
      `SELECT
        id,
        name,
        contact_name,
        start_date,
        created_at,
        onboarding_completed_at,
        growth_stage
      FROM clients
      WHERE id = $1`,
      [clientId]
    )

    if (clientResult.rows.length === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const client = clientResult.rows[0]

    // Extract first name from contact_name
    const contactFirstName = client.contact_name
      ? client.contact_name.split(' ')[0]
      : null

    // Calculate month number (1-indexed)
    const startDate = client.start_date ? new Date(client.start_date) : new Date(client.created_at)
    const monthsActive = Math.max(1, Math.ceil((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)))

    // Calculate onboarding status using start_date (Stripe signup) or created_at
    const clientStartDate = client.start_date
      ? new Date(client.start_date)
      : new Date(client.created_at)
    const clientAgeInDays = Math.floor(
      (Date.now() - clientStartDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    const isOnboarding = clientAgeInDays < 30 && !client.onboarding_completed_at

    // If still onboarding, return minimal data
    if (isOnboarding) {
      return NextResponse.json({
        isOnboarding: true,
        clientAge: clientAgeInDays,
        companyName: client.name,
        contactFirstName,
        growthStage: client.growth_stage,
        monthNumber: monthsActive
      })
    }

    // Fetch all welcome dashboard data in parallel
    const [activityResult, subscriptionResult, alertsResult, recommendationsResult] = await Promise.all([
      // Recent activity (5 items)
      getClientActivity(clientId, { limit: 5 }).catch(err => {
        console.error('Activity feed error:', err)
        return []
      }),

      // Billing summary
      getSubscriptionData(clientId).catch(err => {
        console.error('Subscription data error:', err)
        return null
      }),

      // Result alerts from client_communications table
      dbPool.query(
        `SELECT id, title, body, highlight_type, sent_at, created_at
         FROM client_communications
         WHERE client_id = $1
           AND comm_type = 'result_alert'
         ORDER BY sent_at DESC NULLS LAST, created_at DESC
         LIMIT 5`,
        [clientId]
      ).catch(err => {
        console.error('Alerts query error:', err)
        return { rows: [] }
      }),

      // Smart recommendations (published only)
      dbPool.query(
        `SELECT
           sr.id,
           sr.published_at,
           sri.id as item_id,
           sri.priority,
           sri.why_note,
           sri.is_featured,
           sri.price_option,
           sri.created_at as item_created_at,
           p.id as product_id,
           p.name as product_name,
           p.short_description,
           p.long_description,
           p.monthly_price,
           p.onetime_price,
           p.category
         FROM smart_recommendations sr
         JOIN smart_recommendation_items sri ON sri.recommendation_id = sr.id
         JOIN products p ON p.id = sri.product_id
         WHERE sr.client_id = $1
           AND sr.status = 'published'
         ORDER BY sri.priority ASC
         LIMIT 8`,
        [clientId]
      ).catch(err => {
        console.error('Recommendations query error:', err)
        return { rows: [] }
      })
    ])

    // Build billing summary from subscription data
    const billing = subscriptionResult ? {
      lastInvoice: subscriptionResult.invoices?.[0] || null,
      nextBillingDate: subscriptionResult.subscription?.currentPeriodEnd || null,
      nextBillingDateFormatted: subscriptionResult.subscription?.currentPeriodEndFormatted || null,
      monthlyTotal: subscriptionResult.subscription?.monthlyAmountAfterDiscount || 0,
      status: subscriptionResult.subscription?.status || 'unknown'
    } : null

    // Format alerts from client_communications
    const resultAlerts = alertsResult.rows.map((alert: any) => ({
      id: alert.id,
      type: alert.highlight_type || 'milestone',
      message: alert.title,
      createdAt: alert.sent_at || alert.created_at,
      isDismissed: false
    }))

    // Format recommendations
    const recommendations = recommendationsResult.rows.map((rec: any) => ({
      id: rec.item_id,
      productId: rec.product_id,
      productName: rec.product_name,
      category: rec.category,
      description: rec.short_description,
      longDescription: rec.long_description,
      whyNote: rec.why_note,
      isFeatured: rec.is_featured,
      priceOption: rec.price_option,
      monthlyPrice: rec.monthly_price ? Number(rec.monthly_price) : null,
      onetimePrice: rec.onetime_price ? Number(rec.onetime_price) : null,
      priority: rec.priority,
      createdAt: rec.item_created_at
    }))

    return NextResponse.json({
      isOnboarding: false,
      clientAge: clientAgeInDays,
      companyName: client.name,
      contactFirstName,
      growthStage: client.growth_stage,
      monthNumber: monthsActive,
      recentActivity: activityResult || [],
      resultAlerts,
      billing,
      recommendations,
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Welcome summary error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch welcome summary' },
      { status: 500 }
    )
  }
}
