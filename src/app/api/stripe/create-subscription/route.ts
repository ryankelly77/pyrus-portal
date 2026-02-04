// @ts-nocheck - Stripe and Supabase types may not perfectly align
import { NextRequest, NextResponse } from 'next/server'
import { stripe, getOrCreateCoupon } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { logCheckoutError } from '@/lib/alerts'

interface CartItem {
  id: string
  name: string
  quantity: number
  monthlyPrice: number
  onetimePrice: number
  pricingType: 'monthly' | 'onetime'
  category?: string
  stripeMonthlyPriceId?: string
  stripeOnetimePriceId?: string
  isFree?: boolean
  freeQuantity?: number
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId, items, couponCode, recommendationId, selectedTier } = body as {
      clientId: string
      items: CartItem[]
      couponCode?: string
      recommendationId?: string
      selectedTier?: string  // 'good', 'better', 'best'
    }

    if (!clientId || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Client ID and items are required' },
        { status: 400 }
      )
    }

    // Separate monthly and one-time items
    const monthlyItems = items.filter(item =>
      item.pricingType === 'monthly' &&
      item.monthlyPrice > 0 &&
      !item.isFree &&
      item.stripeMonthlyPriceId
    )
    const onetimeItems = items.filter(item =>
      item.pricingType === 'onetime' &&
      item.onetimePrice > 0 &&
      item.stripeOnetimePriceId
    )

    if (monthlyItems.length === 0) {
      return NextResponse.json(
        { error: 'No monthly items with Stripe price IDs. Use payment-intent endpoint for one-time only.' },
        { status: 400 }
      )
    }

    // Get client from database using Prisma
    const client = await prisma.clients.findUnique({
      where: { id: clientId }
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Create or retrieve Stripe customer
    let stripeCustomerId = (client as any).stripe_customer_id as string | null

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        name: client.name,
        email: client.contact_email || undefined,
        metadata: {
          pyrus_client_id: client.id,
        },
      })
      stripeCustomerId = customer.id

      // Save Stripe customer ID to database
      try {
        await prisma.clients.update({
          where: { id: clientId },
          data: { stripe_customer_id: stripeCustomerId }
        })
        console.log(`Saved Stripe customer ${stripeCustomerId} for client ${clientId}`)
      } catch (saveError: any) {
        console.error(`Failed to save Stripe customer ID for client ${clientId}:`, saveError)
        logCheckoutError(
          'Failed to save Stripe customer ID to database',
          clientId,
          { step: 'save_customer_id', error: saveError.message },
          'create-subscription/route.ts'
        )
        // Continue with checkout - customer was created in Stripe
      }
    } else {
      console.log(`Reusing existing Stripe customer ${stripeCustomerId} for client ${clientId}`)
    }

    // Get or create coupon if provided
    let couponId: string | null = null
    if (couponCode) {
      couponId = await getOrCreateCoupon(couponCode)
    }

    // Build subscription line items
    const subscriptionItems = monthlyItems.map(item => {
      // Calculate paid quantity (accounting for free items)
      const freeQty = item.freeQuantity || 0
      const paidQty = Math.max(0, item.quantity - freeQty)

      return {
        price: item.stripeMonthlyPriceId!,
        quantity: paidQty > 0 ? paidQty : item.quantity,
      }
    }).filter(item => item.quantity > 0)

    if (subscriptionItems.length === 0) {
      return NextResponse.json(
        { error: 'No paid monthly items after accounting for free items' },
        { status: 400 }
      )
    }

    // Create subscription with incomplete payment to add invoice items first
    const subscriptionParams: Parameters<typeof stripe.subscriptions.create>[0] = {
      customer: stripeCustomerId,
      items: subscriptionItems,
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        pyrus_client_id: clientId,
        recommendation_id: recommendationId || '',
        selected_tier: selectedTier || '',
      },
    }

    // Apply coupon if available
    if (couponId) {
      subscriptionParams.coupon = couponId
    }

    // Create the subscription
    const subscription = await stripe.subscriptions.create(subscriptionParams)

    // Add one-time items to the first invoice if there are any
    if (onetimeItems.length > 0 && subscription.latest_invoice) {
      const invoiceId = typeof subscription.latest_invoice === 'string'
        ? subscription.latest_invoice
        : subscription.latest_invoice.id

      // Add invoice items for one-time purchases
      for (const item of onetimeItems) {
        await stripe.invoiceItems.create({
          customer: stripeCustomerId,
          invoice: invoiceId,
          price: item.stripeOnetimePriceId!,
          quantity: item.quantity,
        })
      }
    }

    // Get the payment intent client secret
    const invoice = subscription.latest_invoice as { payment_intent?: { client_secret: string, id: string } | string }
    let clientSecret: string | null = null
    let paymentIntentId: string | null = null

    if (invoice && typeof invoice !== 'string' && invoice.payment_intent) {
      if (typeof invoice.payment_intent === 'string') {
        // Need to retrieve the payment intent
        const pi = await stripe.paymentIntents.retrieve(invoice.payment_intent)
        clientSecret = pi.client_secret
        paymentIntentId = pi.id
      } else {
        clientSecret = invoice.payment_intent.client_secret
        paymentIntentId = invoice.payment_intent.id
      }
    }

    if (!clientSecret) {
      return NextResponse.json(
        { error: 'Failed to get payment client secret' },
        { status: 500 }
      )
    }

    // Save subscription ID to database
    if (recommendationId) {
      const sub = subscription as any
      await prisma.subscriptions.create({
        data: {
          client_id: clientId,
          recommendation_id: recommendationId,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: stripeCustomerId,
          status: 'incomplete',
          current_period_start: sub.current_period_start
            ? new Date(sub.current_period_start * 1000)
            : null,
          current_period_end: sub.current_period_end
            ? new Date(sub.current_period_end * 1000)
            : null,
        }
      })
    }

    return NextResponse.json({
      clientSecret,
      subscriptionId: subscription.id,
      paymentIntentId,
      status: subscription.status,
    })
  } catch (error: any) {
    console.error('Error creating subscription:', error)
    logCheckoutError(
      `Subscription creation failed: ${error.message || 'Unknown error'}`,
      clientId,
      { step: 'create_subscription', error: error.message },
      'create-subscription/route.ts'
    )
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    )
  }
}
