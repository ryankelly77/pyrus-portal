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

    // Get recommendation items for the selected tier to create subscription items
    let recommendationItems: Array<{
      product_id: string | null
      bundle_id: string | null
      quantity: number | null
      monthly_price: any
      onetime_price: any
    }> = []

    if (recommendationId && selectedTier) {
      const items = await prisma.recommendation_items.findMany({
        where: {
          recommendation_id: recommendationId,
          tier: selectedTier,
        },
        select: {
          product_id: true,
          bundle_id: true,
          quantity: true,
          monthly_price: true,
          onetime_price: true,
        },
      })
      recommendationItems = items
      console.log('[FreeOrder] Found', items.length, 'recommendation items for tier:', selectedTier)
    }

    // Create a subscription record without Stripe (for $0 orders)
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

    // Create subscription items to link products to the subscription
    // This is required for the client to be detected as "active"
    if (recommendationItems.length > 0) {
      const subscriptionItemsData = recommendationItems
        .filter(item => item.product_id || item.bundle_id)
        .map(item => ({
          subscription_id: subscription.id,
          product_id: item.product_id,
          bundle_id: item.bundle_id,
          quantity: item.quantity || 1,
          unit_amount: item.monthly_price || item.onetime_price || 0,
        }))

      if (subscriptionItemsData.length > 0) {
        await prisma.subscription_items.createMany({
          data: subscriptionItemsData,
        })
        console.log('[FreeOrder] Created', subscriptionItemsData.length, 'subscription items')
      }
    }

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

    // Update client status to active and growth stage to seedling (from prospect)
    await prisma.clients.update({
      where: { id: clientId },
      data: {
        status: 'active',
        growth_stage: 'seedling',
        start_date: new Date(),
      },
    })
    console.log('[FreeOrder] Updated client status to active, growth_stage to seedling')

    // Log purchase activity for notifications
    await prisma.activity_log.create({
      data: {
        client_id: clientId,
        activity_type: 'purchase',
        description: `${client.contact_name || client.name} purchased the ${selectedTier ? selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1) : ''} Plan`,
        metadata: {
          tier: selectedTier,
          couponCode,
          billingCycle,
          isFreeOrder: true,
          subscriptionId: subscription.id,
        },
      },
    })
    console.log('[FreeOrder] Created purchase activity log')

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
