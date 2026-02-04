import { NextRequest, NextResponse } from 'next/server'
import { stripe, getOrCreateCoupon } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { logSubscriptionSafeguard, logStateResetBlocked, logCheckoutError, logBillingSyncFailure } from '@/lib/alerts'

interface CartItem {
  name: string
  price: number
  billingPeriod: 'monthly' | 'one-time'
}

export async function POST(request: NextRequest) {
  let clientId: string | undefined
  try {
    const body = await request.json()
    const parsed = body as {
      clientId: string
      paymentMethodId: string
      recommendationId?: string
      selectedTier?: string
      cartItems: CartItem[]
      couponCode?: string
      billingCycle?: 'monthly' | 'annual'
    }
    clientId = parsed.clientId
    const {
      paymentMethodId,
      recommendationId,
      selectedTier,
      cartItems,
      couponCode,
      billingCycle,
    } = parsed

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

    // LAYER 1: Server-side guard - check for existing active subscription
    // This prevents creating duplicate subscriptions if frontend logic fails
    if (stripeCustomerId) {
      const existingSubscriptions = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: 'active',
        limit: 1,
      })

      if (existingSubscriptions.data.length > 0) {
        // Log alert for monitoring - don't await to avoid blocking the response
        logSubscriptionSafeguard(
          `Blocked duplicate subscription creation - client already has active subscription`,
          clientId,
          { existingSubscriptionId: existingSubscriptions.data[0].id, stripeCustomerId },
          'create-subscription-from-setup/route.ts'
        )
        return NextResponse.json(
          {
            error: 'Client already has an active subscription. Use the add-to-subscription flow instead.',
            existingSubscriptionId: existingSubscriptions.data[0].id,
          },
          { status: 409 }
        )
      }
    }

    if (!stripeCustomerId) {
      // Create Stripe customer
      try {
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
      } catch (error: any) {
        logCheckoutError(
          'Failed to create Stripe customer',
          clientId,
          { step: 'create_customer', error: error.message },
          'create-subscription-from-setup/route.ts'
        )
        throw error
      }
    }

    // Attach payment method to customer
    try {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: stripeCustomerId,
      })
    } catch (error: any) {
      logCheckoutError(
        'Failed to attach payment method',
        clientId,
        { step: 'attach_payment_method', error: error.message, paymentMethodId },
        'create-subscription-from-setup/route.ts'
      )
      throw error
    }

    // Set as default payment method
    try {
      await stripe.customers.update(stripeCustomerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      })
    } catch (error: any) {
      logCheckoutError(
        'Failed to set default payment method',
        clientId,
        { step: 'set_default_payment', error: error.message },
        'create-subscription-from-setup/route.ts'
      )
      throw error
    }

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

    // Create product and price separately (Stripe API doesn't support inline product_data)
    const productName = selectedTier ? `${selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)} Plan` : 'Monthly Plan'
    const product = await stripe.products.create({
      name: productName,
      metadata: {
        pyrus_client_id: clientId,
        tier: selectedTier || '',
      },
    })

    const price = await stripe.prices.create({
      product: product.id,
      currency: 'usd',
      unit_amount: Math.round(monthlyTotal * 100),
      recurring: {
        interval: billingCycle === 'annual' ? 'year' : 'month',
      },
    })

    const subscriptionParams: any = {
      customer: stripeCustomerId,
      items: [{
        price: price.id,
      }],
      default_payment_method: paymentMethodId,
      metadata: {
        pyrus_client_id: clientId,
        recommendation_id: recommendationId || '',
        selected_tier: selectedTier || '',
      },
    }

    if (couponId) {
      subscriptionParams.discounts = [{ coupon: couponId }]
    }

    let subscription
    try {
      subscription = await stripe.subscriptions.create(subscriptionParams)
    } catch (error: any) {
      logCheckoutError(
        'Failed to create Stripe subscription',
        clientId,
        { step: 'create_subscription', error: error.message, monthlyTotal },
        'create-subscription-from-setup/route.ts'
      )
      throw error
    }

    // ============================================
    // CRITICAL SECTION: Subscription created in Stripe
    // Any DB sync failures after this point are CRITICAL
    // because money has already been charged
    // ============================================

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

    // Safely parse dates from Stripe response
    const now = new Date()
    const periodStart = (subscription as any).current_period_start
      ? new Date((subscription as any).current_period_start * 1000)
      : now
    const periodEnd = (subscription as any).current_period_end
      ? new Date((subscription as any).current_period_end * 1000)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Save subscription to database
    let dbSubscription
    try {
      dbSubscription = await prisma.subscriptions.create({
        data: {
          client_id: clientId,
          recommendation_id: recommendationId || null,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: stripeCustomerId,
          status: subscription.status,
          current_period_start: periodStart,
          current_period_end: periodEnd,
        },
      })
    } catch (error: any) {
      // CRITICAL: Subscription was created in Stripe but DB sync failed
      logBillingSyncFailure(
        'CRITICAL: Stripe subscription created but failed to save to database',
        clientId,
        { step: 'sync_subscription_to_db', error: error.message, stripeSubscriptionId: subscription.id, monthlyTotal },
        'create-subscription-from-setup/route.ts'
      )
      throw error
    }

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
        try {
          await prisma.subscription_items.createMany({
            data: subscriptionItemsData,
          })
        } catch (error: any) {
          // CRITICAL: Subscription items sync failed
          logBillingSyncFailure(
            'CRITICAL: Failed to sync subscription items to database',
            clientId,
            { step: 'sync_subscription_items', error: error.message, stripeSubscriptionId: subscription.id },
            'create-subscription-from-setup/route.ts'
          )
          // Continue - subscription is still valid, just missing item details
        }
      }
    }

    // Update recommendation status if provided
    if (recommendationId) {
      try {
        await prisma.recommendations.update({
          where: { id: recommendationId },
          data: {
            status: 'accepted',
            purchased_tier: selectedTier || null,
            purchased_at: new Date(),
          },
        })
      } catch (error: any) {
        // Non-critical: recommendation status update failed
        logCheckoutError(
          'Failed to update recommendation status after purchase',
          clientId,
          { step: 'update_recommendation', error: error.message, recommendationId },
          'create-subscription-from-setup/route.ts'
        )
        // Continue - purchase is still valid
      }
    }

    // Update client status - only set growth stage and start_date for genuinely new clients
    // This prevents resetting state for existing clients if they somehow reach this endpoint
    const clientAny = client as any
    const isGenuinelyNewClient = !clientAny.start_date &&
      (!clientAny.status || clientAny.status === 'pending' || clientAny.status === 'prospect')

    if (isGenuinelyNewClient) {
      // New client - set initial state
      await prisma.clients.update({
        where: { id: clientId },
        data: {
          status: 'active',
          growth_stage: 'seedling',
          start_date: new Date(),
        },
      })
    } else {
      // Existing client - only update status if needed, preserve start_date and growth_stage
      logStateResetBlocked(
        `Preserved existing client state - client already has start_date or active status`,
        clientId,
        { existingStatus: clientAny.status, existingStartDate: clientAny.start_date, existingGrowthStage: clientAny.growth_stage },
        'create-subscription-from-setup/route.ts'
      )
      if (clientAny.status !== 'active') {
        await prisma.clients.update({
          where: { id: clientId },
          data: { status: 'active' },
        })
      }
    }

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
  } catch (error: any) {
    console.error('Error creating subscription from setup:', error)
    // Log checkout error if not already logged by a more specific handler
    logCheckoutError(
      `Checkout failed: ${error.message || 'Unknown error'}`,
      clientId,
      { step: 'unknown', error: error.message, stack: error.stack?.slice(0, 500) },
      'create-subscription-from-setup/route.ts'
    )
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    )
  }
}
