import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface CartItem {
  name: string
  price: number
  billingPeriod: 'monthly' | 'one-time'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      clientId,
      recommendationId,
      selectedTier,
      cartItems,
      couponCode,
      billingCycle,
    } = body as {
      clientId: string
      recommendationId?: string
      selectedTier?: string
      cartItems: CartItem[]
      couponCode?: string
      billingCycle?: 'monthly' | 'annual'
    }

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      )
    }

    // Verify this is actually a $0 order by checking the coupon
    if (!couponCode) {
      return NextResponse.json(
        { error: 'Free orders require a valid coupon code' },
        { status: 400 }
      )
    }

    // Get client from database
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    console.log('[FreeOrder] Processing $0 order for client:', client.name)
    console.log('[FreeOrder] Coupon:', couponCode, 'Tier:', selectedTier, 'Items:', cartItems.length)

    // Create a subscription record without Stripe (for $0 orders)
    // This allows us to track the free subscription in our system
    const subscription = await prisma.subscriptions.create({
      data: {
        client_id: clientId,
        recommendation_id: recommendationId || null,
        stripe_subscription_id: `free_${Date.now()}`, // Placeholder for free orders
        stripe_customer_id: client.stripe_customer_id || null,
        status: 'active',
        current_period_start: new Date(),
        current_period_end: billingCycle === 'annual'
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      },
    })

    console.log('[FreeOrder] Created subscription:', subscription.id)

    // Update recommendation status if provided
    if (recommendationId) {
      await prisma.recommendations.update({
        where: { id: recommendationId },
        data: {
          status: 'accepted',
          purchased_tier: selectedTier || null,
          purchased_at: new Date(),
        },
      })
      console.log('[FreeOrder] Updated recommendation:', recommendationId)
    }

    // Update client status to active
    await prisma.clients.update({
      where: { id: clientId },
      data: { status: 'active' },
    })
    console.log('[FreeOrder] Updated client status to active')

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      status: 'active',
      isFreeOrder: true,
    })
  } catch (error) {
    console.error('[FreeOrder] Error processing free order:', error)
    return NextResponse.json(
      { error: 'Failed to process order' },
      { status: 500 }
    )
  }
}
