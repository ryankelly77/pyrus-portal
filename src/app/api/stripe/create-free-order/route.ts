import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe, getOrCreateCoupon } from '@/lib/stripe'

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

    // Get or create Stripe customer
    let stripeCustomerId = client.stripe_customer_id

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        name: client.name,
        email: client.contact_email || undefined,
        metadata: { pyrus_client_id: client.id },
      })
      stripeCustomerId = customer.id

      await prisma.clients.update({
        where: { id: clientId },
        data: { stripe_customer_id: stripeCustomerId },
      })
      console.log('[FreeOrder] Created Stripe customer:', stripeCustomerId)
    }

    // Get or create coupon in Stripe
    const couponId = await getOrCreateCoupon(couponCode)
    if (!couponId) {
      return NextResponse.json(
        { error: 'Invalid coupon code' },
        { status: 400 }
      )
    }
    console.log('[FreeOrder] Using Stripe coupon:', couponId)

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

    // Calculate totals from cart items (original price before discount)
    const monthlyItems = cartItems.filter(item => item.billingPeriod === 'monthly' && item.price > 0)
    const monthlyTotal = monthlyItems.reduce((sum, item) => sum + item.price, 0)
    const onetimeItems = cartItems.filter(item => item.billingPeriod === 'one-time' && item.price > 0)
    const onetimeTotal = onetimeItems.reduce((sum, item) => sum + item.price, 0)

    // Create Stripe subscription with 100% coupon
    // Even though it's $0, we create a real subscription for tracking

    // First create a product for this plan
    const productName = selectedTier ? `${selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)} Plan` : 'Monthly Plan'
    const product = await stripe.products.create({
      name: productName,
      metadata: {
        pyrus_client_id: clientId,
        tier: selectedTier || '',
      },
    })
    console.log('[FreeOrder] Created Stripe product:', product.id)

    // Then create a price for the product
    const price = await stripe.prices.create({
      product: product.id,
      currency: 'usd',
      unit_amount: Math.round(monthlyTotal * 100), // Original price in cents
      recurring: {
        interval: billingCycle === 'annual' ? 'year' : 'month',
      },
    })
    console.log('[FreeOrder] Created Stripe price:', price.id)

    const subscriptionParams: any = {
      customer: stripeCustomerId,
      items: [{
        price: price.id,
      }],
      coupon: couponId,
      metadata: {
        pyrus_client_id: clientId,
        recommendation_id: recommendationId || '',
        selected_tier: selectedTier || '',
        is_free_order: 'true',
      },
    }

    const stripeSubscription = await stripe.subscriptions.create(subscriptionParams) as any

    console.log('[FreeOrder] Created Stripe subscription:', stripeSubscription.id)

    // Create local subscription record
    const subscription = await prisma.subscriptions.create({
      data: {
        client_id: clientId,
        recommendation_id: recommendationId || null,
        stripe_subscription_id: stripeSubscription.id,
        stripe_customer_id: stripeCustomerId,
        status: 'active',
        monthly_amount: 0, // $0 after coupon
        current_period_start: new Date(stripeSubscription.current_period_start * 1000),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000),
      },
    })

    console.log('[FreeOrder] Created local subscription:', subscription.id)

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
    const tierDisplay = selectedTier ? selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1) : ''
    let purchaseDescription = `${client.contact_name || client.name} purchased the ${tierDisplay} Plan`
    if (monthlyTotal > 0 || onetimeTotal > 0) {
      const originalParts: string[] = []
      if (monthlyTotal > 0) originalParts.push(`$${monthlyTotal.toLocaleString()}/mo`)
      if (onetimeTotal > 0) originalParts.push(`$${onetimeTotal.toLocaleString()} one-time`)
      purchaseDescription += ` - ${originalParts.join(' + ')} → $0 (100% off with ${couponCode})`
    } else {
      purchaseDescription += ` (100% off with ${couponCode})`
    }

    await prisma.activity_log.create({
      data: {
        client_id: clientId,
        activity_type: 'purchase',
        description: purchaseDescription,
        metadata: {
          tier: selectedTier,
          couponCode,
          billingCycle,
          monthlyTotal,
          onetimeTotal,
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
