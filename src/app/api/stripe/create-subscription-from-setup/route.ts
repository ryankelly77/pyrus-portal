import { NextRequest, NextResponse } from 'next/server'
import { stripe, getOrCreateCoupon } from '@/lib/stripe'
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
      paymentMethodId,
      recommendationId,
      selectedTier,
      cartItems,
      couponCode,
      billingCycle,
    } = body as {
      clientId: string
      paymentMethodId: string
      recommendationId?: string
      selectedTier?: string
      cartItems: CartItem[]
      couponCode?: string
      billingCycle?: 'monthly' | 'annual'
    }

    if (!clientId || !paymentMethodId) {
      return NextResponse.json(
        { error: 'Client ID and payment method are required' },
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

    let stripeCustomerId = (client as any).stripe_customer_id as string | null

    if (!stripeCustomerId) {
      // Create Stripe customer
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
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: stripeCustomerId,
    })

    // Set as default payment method
    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    })

    // Get or create coupon if provided
    let couponId: string | null = null
    let discountPercent = 0
    if (couponCode) {
      couponId = await getOrCreateCoupon(couponCode)
      // Fetch coupon details to get discount percentage
      if (couponId) {
        try {
          const coupon = await stripe.coupons.retrieve(couponId)
          discountPercent = coupon.percent_off || 0
        } catch (e) {
          console.error('Failed to fetch coupon details:', e)
        }
      }
    }

    // Calculate monthly total from cart items
    const monthlyItems = cartItems.filter(item => item.billingPeriod === 'monthly' && item.price > 0)
    const monthlyTotal = monthlyItems.reduce((sum, item) => sum + item.price, 0)

    // Calculate one-time total from cart items
    const onetimeItems = cartItems.filter(item => item.billingPeriod === 'one-time' && item.price > 0)
    const onetimeTotal = onetimeItems.reduce((sum, item) => sum + item.price, 0)

    if (monthlyTotal === 0) {
      return NextResponse.json(
        { error: 'No monthly items to subscribe to' },
        { status: 400 }
      )
    }

    // Create subscription using default price
    // The subscription will use the customer's default payment method
    const subscriptionParams: any = {
      customer: stripeCustomerId,
      items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: selectedTier ? `${selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)} Plan` : 'Monthly Plan',
            metadata: {
              pyrus_client_id: clientId,
              tier: selectedTier || '',
            },
          },
          unit_amount: Math.round(monthlyTotal * 100),
          recurring: {
            interval: billingCycle === 'annual' ? 'year' : 'month',
          },
        },
      }],
      default_payment_method: paymentMethodId,
      metadata: {
        pyrus_client_id: clientId,
        recommendation_id: recommendationId || '',
        selected_tier: selectedTier || '',
      },
    }

    if (couponId) {
      subscriptionParams.coupon = couponId
    }

    const subscription = await stripe.subscriptions.create(subscriptionParams)

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
    }

    // Save subscription to database
    const dbSubscription = await prisma.subscriptions.create({
      data: {
        client_id: clientId,
        recommendation_id: recommendationId || null,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: stripeCustomerId,
        status: subscription.status,
        current_period_start: new Date((subscription as any).current_period_start * 1000),
        current_period_end: new Date((subscription as any).current_period_end * 1000),
      },
    })

    // Create subscription items to link products to the subscription
    // This is required for the client to be detected as "active"
    if (recommendationItems.length > 0) {
      const subscriptionItemsData = recommendationItems
        .filter(item => item.product_id || item.bundle_id)
        .map(item => ({
          subscription_id: dbSubscription.id,
          product_id: item.product_id,
          bundle_id: item.bundle_id,
          quantity: item.quantity || 1,
          unit_amount: item.monthly_price || item.onetime_price || 0,
        }))

      if (subscriptionItemsData.length > 0) {
        await prisma.subscription_items.createMany({
          data: subscriptionItemsData,
        })
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

    // Log purchase activity for notifications
    const tierDisplay = selectedTier ? selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1) : ''
    let purchaseDescription = `${client.contact_name || client.name} purchased the ${tierDisplay} Plan`
    if (monthlyTotal > 0 || onetimeTotal > 0) {
      const originalParts: string[] = []
      if (monthlyTotal > 0) originalParts.push(`$${monthlyTotal.toLocaleString()}/mo`)
      if (onetimeTotal > 0) originalParts.push(`$${onetimeTotal.toLocaleString()} one-time`)

      if (discountPercent > 0) {
        // Calculate discounted amounts
        const discountedMonthly = Math.round(monthlyTotal * (1 - discountPercent / 100) * 100) / 100
        const discountedOnetime = Math.round(onetimeTotal * (1 - discountPercent / 100) * 100) / 100
        const discountedParts: string[] = []
        if (monthlyTotal > 0) discountedParts.push(`$${discountedMonthly.toLocaleString()}/mo`)
        if (onetimeTotal > 0) discountedParts.push(`$${discountedOnetime.toLocaleString()} one-time`)
        purchaseDescription += ` - ${originalParts.join(' + ')} → ${discountedParts.join(' + ')} (${discountPercent}% off with ${couponCode})`
      } else if (couponCode) {
        purchaseDescription += ` - ${originalParts.join(' + ')} (with coupon: ${couponCode})`
      } else {
        purchaseDescription += ` - ${originalParts.join(' + ')}`
      }
    } else if (couponCode) {
      purchaseDescription += ` (with coupon: ${couponCode})`
    }

    await prisma.activity_log.create({
      data: {
        client_id: clientId,
        activity_type: 'purchase',
        description: purchaseDescription,
        metadata: {
          tier: selectedTier,
          couponCode,
          discountPercent,
          billingCycle,
          monthlyTotal,
          onetimeTotal,
          stripeSubscriptionId: subscription.id,
        },
      },
    })

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      status: subscription.status,
    })
  } catch (error) {
    console.error('Error creating subscription from setup:', error)
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    )
  }
}
