import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

// POST /api/admin/subscriptions/backfill - Create subscription from existing recommendation purchase
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth
    const body = await request.json()
    const { clientId } = body

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
    }

    // Check if subscription already exists
    const existingSubscription = await prisma.subscriptions.findFirst({
      where: { client_id: clientId },
    })

    if (existingSubscription) {
      return NextResponse.json(
        { error: 'Subscription already exists for this client' },
        { status: 400 }
      )
    }

    // Get the recommendation with purchased tier
    const recommendation = await prisma.recommendations.findFirst({
      where: {
        client_id: clientId,
        purchased_tier: { not: null },
      },
      include: {
        recommendation_items: {
          include: {
            product: true,
            bundle: true,
            addon: true,
          },
        },
      },
      orderBy: { updated_at: 'desc' },
    })

    if (!recommendation || !recommendation.purchased_tier) {
      return NextResponse.json(
        { error: 'No purchased recommendation found for this client' },
        { status: 404 }
      )
    }

    // Get client's stripe_customer_id
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
      select: { stripe_customer_id: true },
    })

    // Filter items by purchased tier
    const purchasedItems = recommendation.recommendation_items.filter(
      item => item.tier === recommendation.purchased_tier
    )

    // Calculate monthly total
    const monthlyTotal = purchasedItems.reduce((sum, item) => {
      return sum + Number(item.monthly_price || 0)
    }, 0)

    // Create subscription record
    const subscription = await prisma.subscriptions.create({
      data: {
        client_id: clientId,
        recommendation_id: recommendation.id,
        stripe_customer_id: client?.stripe_customer_id || null,
        status: 'active',
        current_period_start: recommendation.purchased_at || new Date(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        monthly_amount: monthlyTotal,
      },
    })

    // Create subscription items from recommendation items
    const subscriptionItems = purchasedItems.map(item => ({
      subscription_id: subscription.id,
      product_id: item.product_id,
      bundle_id: item.bundle_id,
      quantity: item.quantity || 1,
      unit_amount: item.is_free ? 0 : Number(item.monthly_price || 0),
    }))

    await prisma.subscription_items.createMany({
      data: subscriptionItems,
    })

    // Fetch the created subscription with items
    const createdSubscription = await prisma.subscriptions.findUnique({
      where: { id: subscription.id },
      include: {
        subscription_items: {
          include: {
            product: true,
            bundle: true,
          },
        },
      },
    })

    return NextResponse.json({
      message: 'Subscription created successfully',
      subscription: createdSubscription,
      itemCount: subscriptionItems.length,
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to backfill subscription:', error)
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}
