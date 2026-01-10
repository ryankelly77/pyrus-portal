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
    if (couponCode) {
      couponId = await getOrCreateCoupon(couponCode)
    }

    // Calculate monthly total from cart items
    const monthlyItems = cartItems.filter(item => item.billingPeriod === 'monthly' && item.price > 0)
    const monthlyTotal = monthlyItems.reduce((sum, item) => sum + item.price, 0)

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

    // Save subscription to database
    await prisma.subscriptions.create({
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

    // Update client status to active
    await prisma.clients.update({
      where: { id: clientId },
      data: { status: 'active' },
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
